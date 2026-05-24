import { Recording, Execution } from "@pretzel-graph/shared/domain"
import { Workflow } from "@pretzel-graph/shared/domain/Workflow"
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port"
import { Vertex } from "../S2/graph"
import type { AggexEngine } from "./index"

export class FlightRecorderService {

    private readonly executionId: Execution.Id
    private readonly origin:      number

    private recording!:    Recording
    private mostRecentUoW: Map<Workflow.Node.Id, Recording.UnitOfWork.Id> = new Map()

    constructor(
        executionId:  Execution.Id,
        workflowId:   Workflow.Id,
        workflowData: Workflow.Data,
        origin:       number,  // performance.now() at execution start
    ) {
        this.executionId = executionId
        this.origin      = origin

        this.recording = {
            id:                   Recording.createId(executionId),
            executionId,
            workflowId,
            workflowDataSnapshot: workflowData,
            createdAt:            new Date().toISOString(),
            units:                {},
            relations:            {},
            tracks:               {},
            dataBank:             { snapshots: {} },
        }
        Object.values(workflowData.nodes).forEach(node => {
            this.recording.tracks[node.id] = {
                id:      node.id,
                unitIds: [],
            }
        })
    }



    // Called from AggexEngine.onNodeFired.
    // Creates a new UnitOfWork for the node, appends it to the track.
    public onNodeFired(nodeId: Workflow.Node.Id): void {
        const unitId    = Recording.UnitOfWork.createId(nodeId)
        const startedAt = performance.now() - this.origin

        const unit: Recording.UnitOfWork = {
            id:             unitId,
            trackId:        nodeId,
            status:         "running",
            startedAt,
            inputSnapshot:  {},
            outputSnapshot: {},
        }

        this.recording.units[unitId] = unit
        this.recording.tracks[nodeId].unitIds.push(unitId)
        this.mostRecentUoW.set(nodeId, unitId)
    }



    // Called from AggexEngine.onNodeExecuted (has the signals set).
    // Detects signal vs dataRemnant relations by comparing signals against allDeps.
    // Populates inputSnapshot by pointing to the source UoW's DataBank entries.
    public onNodeExecuted(
        nodeId:  Workflow.Node.Id,
        signals: Set<Workflow.Node.Id | Vertex.Id>,
        allDeps: Set<Vertex.Id>,
        ctx:     AggexEngine.ExecutionContext,
    ): void {
        const unitId = this.mostRecentUoW.get(nodeId)
        if (!unitId) return

        const unit = this.recording.units[unitId]
        if (!unit) return

        const inputHandles = ctx.workflowCache.inputHandlesMap[nodeId] ?? {}

        ctx.emit<Recording.Event.Unit.Started>({
            channel:     Execution.Event.getChannel(this.executionId),
            executionId: this.executionId,
            type:        "unit:started",
            unit,
        })

        const incomingRelations: Recording.Relation[] = []

        for (const [portIdStr, edgeId] of Object.entries(inputHandles)) {
            const portId = portIdStr as Port.Input.Id
            const edge   = ctx.workflowData.edges[edgeId]
            if (!edge) continue

            const sourceNodeId  = edge.source.nodeId
            const sigSet        = signals as Set<string>
            const depSet        = allDeps  as Set<string>
            const isSignal      = sigSet.has(sourceNodeId)
            const isDataRemnant = !isSignal && depSet.has(sourceNodeId)

            if (!isSignal && !isDataRemnant) continue

            const sourceUoWId = this.mostRecentUoW.get(sourceNodeId)
            if (!sourceUoWId) continue

            const snapshotId = Recording.DataBank.PortSnapshot.formatId(sourceUoWId, edge.source.portId)
            unit.inputSnapshot[portId] = snapshotId

            const relationId = Recording.Relation.formatId(sourceUoWId, edge.id, unitId)
            const relation = {
                id:           relationId,
                source:       sourceUoWId,
                target:       unitId,
                edge:         edge.id,
                type:         isSignal ? "signal" : "dataRemnant",
                dataSnapshotId: snapshotId,
            } satisfies Recording.Relation
            this.recording.relations[relationId] = relation

            incomingRelations.push(relation)
        }

        if (incomingRelations.length > 0)
            ctx.emit<Recording.Event.Relation.CreateBatch>({
                channel:     Execution.Event.getChannel(this.executionId),
                executionId: this.executionId,
                type:        "relation:createBatch",
                relations:   incomingRelations,
            })
    }



    // Called from AggexEngine.onNodeCompleted.
    // Sets duration, populates outputSnapshot + DataBank entries.
    public onNodeCompleted(
        nodeId: Workflow.Node.Id,
        ctx:    AggexEngine.ExecutionContext,
    ): void {
        const unitId = this.mostRecentUoW.get(nodeId)
        if (!unitId) return

        const unit = this.recording.units[unitId]
        if (!unit) return

        unit.status   = "completed"
        unit.duration = performance.now() - this.origin - unit.startedAt

        const projections = ctx.session.node_output_projections[nodeId] ?? {}

        for (const [portIdStr, value] of Object.entries(projections)) {
            const portId  = portIdStr as Port.Output.Id
            const snapId  = Recording.DataBank.PortSnapshot.formatId(unitId, portId)

            this.recording.dataBank.snapshots[snapId] = { 
                id: snapId, 
                portId, 
                value 
            }
            unit.outputSnapshot[portId] = snapId
        }

        ctx.emit<Recording.Event.Unit.Completed>({
            channel:        Execution.Event.getChannel(this.executionId),
            executionId:    this.executionId,
            type:           "unit:completed",
            unitId:         unit.id,
            duration:       unit.duration!,
            outputSnapshot: unit.outputSnapshot,
        })
    }



    // Called from AggexEngine.onNodeError.
    // Sets status to failed and duration.
    public onNodeFailed(
        nodeId: Workflow.Node.Id, 
        ctx: AggexEngine.Execution.Context
    ): void {
        const unitId = this.mostRecentUoW.get(nodeId)
        if (!unitId) return

        const unit = this.recording.units[unitId]
        if (!unit) return

        unit.status   = "failed"
        unit.duration = performance.now() - this.origin - unit.startedAt

        ctx.emit<Recording.Event.Unit.Failed>({
            channel:     Execution.Event.getChannel(this.executionId),
            executionId: this.executionId,
            type:        "unit:failed",
            unitId:      unit.id,
            duration:    unit.duration!,
        })
    }



    public onCompleted(emit: (event: Recording.Event) => void): void {
        emit({
            channel:     Execution.Event.getChannel(this.executionId),
            executionId: this.executionId,
            type:        "recording:fullyUploaded",
        })
    }

    public onTerminated(emit: (event: Recording.Event) => void): void {
        emit({
            channel:     Execution.Event.getChannel(this.executionId),
            executionId: this.executionId,
            type:        "recording:fullyUploaded",
        })
    }

    public getRecording(): Recording {
        return this.recording
    }
}
