"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightRecorderService = void 0;
const domain_1 = require("../../../shared/domain");
class FlightRecorderService {
    executionId;
    workflowId;
    origin;
    recording;
    mostRecentUoW = new Map();
    uowInputs = new Map();
    constructor(executionId, workflowId, workflowData, origin) {
        this.executionId = executionId;
        this.workflowId = workflowId;
        this.origin = origin;
        this.recording = {
            workflowDataSnapshot: workflowData,
            units: {},
            relations: {},
            tracks: {},
            dataBank: { snapshots: {} },
        };
        Object.values(workflowData.nodes).forEach(node => {
            this.recording.tracks[node.id] = {
                id: node.id,
                unitIds: [],
            };
        });
    }
    // Called from AggexEngine.onNodeFired.
    // Creates a new UnitOfWork for the node, appends it to the track.
    onNodeFired(nodeId) {
        const unitId = domain_1.Execution.Recording.UnitOfWork.createId(nodeId);
        const startedAt = performance.now() - this.origin;
        const unit = {
            id: unitId,
            trackId: nodeId,
            status: "running",
            startedAt,
            inputSnapshot: {},
            outputSnapshot: {},
            metrics: {},
        };
        this.recording.units[unitId] = unit;
        this.recording.tracks[nodeId].unitIds.push(unitId);
        this.mostRecentUoW.set(nodeId, unitId);
    }
    // Called from AggexEngine.onNodeExecuted (has the signals set).
    // Detects signal vs dataRemnant relations by comparing signals against allDeps.
    // Populates inputSnapshot by pointing to the source UoW's DataBank entries.
    onNodeExecuted(nodeId, signals, allDeps, inputs, fields, ctx) {
        const unitId = this.mostRecentUoW.get(nodeId);
        if (!unitId)
            return;
        const unit = this.recording.units[unitId];
        if (!unit)
            return;
        this.uowInputs.set(unitId, inputs);
        unit.fieldSnapshot = fields;
        const inputHandles = ctx.workflowCache.inputHandlesMap[nodeId] ?? {};
        ctx.realtimeAPI.emit(domain_1.Execution.Event.create("unit:started", { unit }));
        const incomingRelations = [];
        for (const [portIdStr, edgeId] of Object.entries(inputHandles)) {
            const portId = portIdStr;
            const edge = ctx.workflowCache.edges[edgeId];
            if (!edge)
                continue;
            const sourceNodeId = edge.source.nodeId;
            const sigSet = signals;
            const depSet = allDeps;
            const isSignal = sigSet.has(sourceNodeId);
            const isDataRemnant = !isSignal && depSet.has(sourceNodeId);
            if (!isSignal && !isDataRemnant)
                continue;
            const sourceUoWId = this.mostRecentUoW.get(sourceNodeId);
            if (!sourceUoWId)
                continue;
            const snapshotId = domain_1.Execution.Recording.DataBank.PortSnapshot.formatId(sourceUoWId, edge.source.portId);
            unit.inputSnapshot[portId] = snapshotId;
            const relationId = domain_1.Execution.Recording.Relation.formatId(sourceUoWId, edge.id, unitId);
            const relation = {
                id: relationId,
                source: sourceUoWId,
                target: unitId,
                edge: edge.id,
                type: isSignal ? "signal" : "dataRemnant",
                dataSnapshotId: snapshotId,
            };
            this.recording.relations[relationId] = relation;
            incomingRelations.push(relation);
        }
        if (incomingRelations.length > 0)
            ctx.realtimeAPI.emit(domain_1.Execution.Event.create("relation:createBatch", {
                relations: incomingRelations,
            }));
    }
    // Called from AggexEngine.onNodeCompleted.
    // Sets duration, populates outputSnapshot + DataBank entries.
    onNodeCompleted(nodeId, ctx) {
        const unitId = this.mostRecentUoW.get(nodeId);
        if (!unitId)
            return;
        const unit = this.recording.units[unitId];
        if (!unit)
            return;
        unit.status = "completed";
        unit.duration = performance.now() - this.origin - unit.startedAt;
        const projections = ctx.session.node_output_projections[nodeId] ?? {};
        for (const [portIdStr, value] of Object.entries(projections)) {
            const portId = portIdStr;
            const snapId = domain_1.Execution.Recording.DataBank.PortSnapshot.formatId(unitId, portId);
            this.recording.dataBank.snapshots[snapId] = {
                id: snapId,
                portId,
                value
            };
            unit.outputSnapshot[portId] = snapId;
        }
        const metrics = this.collectMetrics(nodeId, unitId, "completed", unit.duration, ctx);
        if (metrics)
            unit.metrics = metrics;
        ctx.realtimeAPI.emit(domain_1.Execution.Event.create("unit:completed", {
            unitId: unit.id,
            duration: unit.duration,
            outputSnapshot: unit.outputSnapshot,
            metrics,
        }));
        this.uowInputs.delete(unitId);
    }
    // Called from AggexEngine.onNodeError.
    // Sets status to failed and duration.
    onNodeFailed(nodeId, ctx) {
        const unitId = this.mostRecentUoW.get(nodeId);
        if (!unitId)
            return;
        const unit = this.recording.units[unitId];
        if (!unit)
            return;
        unit.status = "failed";
        unit.duration = performance.now() - this.origin - unit.startedAt;
        const metrics = this.collectMetrics(nodeId, unitId, "failed", unit.duration, ctx);
        if (metrics)
            unit.metrics = metrics;
        ctx.realtimeAPI.emit(domain_1.Execution.Event.create("unit:failed", {
            unitId: unit.id,
            duration: unit.duration,
            metrics,
        }));
        this.uowInputs.delete(unitId);
    }
    collectMetrics(nodeId, unitId, status, duration, ctx) {
        const instance = ctx.instanceRegistryAPI.get(nodeId);
        if (!instance)
            return undefined;
        const inputs = this.uowInputs.get(unitId) ?? {};
        const outputs = ctx.session.node_output_instances[nodeId] ?? {};
        return instance.recordMetrics({
            inputs: inputs,
            outputs: outputs,
            unitId,
            status,
            duration,
        });
    }
    getRecording() {
        return this.recording;
    }
}
exports.FlightRecorderService = FlightRecorderService;
