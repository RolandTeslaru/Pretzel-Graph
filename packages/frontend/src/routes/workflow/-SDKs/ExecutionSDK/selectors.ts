import type { Foundations, Workflow } from "@pretzel-graph/shared/domain"
import { Execution } from "@pretzel-graph/shared/domain"
import type { ExecutionSDK } from "./sdk"
import { WorkbenchSDK } from "../WorkbenchSDK/sdk"

export const executionSDKSelectors = {
    getNodeStatus: (s, nodeId) => {
        return s.currentExecution?.session.node_status?.[nodeId] ?? Execution.Session.NodeStatus.IDLE
    },
    getEdgeStatus: (s, edgeId) => {
        return s.currentExecution?.session.edge_state?.[edgeId] ?? Execution.Session.EdgeState.IDLE
    },
    getEdgeItemCount: (s, sourceNodeId, sourcePortId) => {
        const projection = s.currentExecution?.session.node_output_projections[sourceNodeId]?.[sourcePortId]
        return Array.isArray(projection) ? projection.length : undefined
    },
    recording: {
        get: (s) => {
            return s.currentExecution?.recording ?? null
        },
        getUoW: (s, id) => {
            return s.currentExecution?.recording?.units[id]
        },
        getTrack: (s, trackId) => {
            return s.currentExecution?.recording?.tracks[trackId]
        },
        getUnits: (s) => {
            return s.currentExecution?.recording?.units
        },
        getRelations: (s) => {
            return s.currentExecution?.recording?.relations
        },
        getSelectedUoW: (s) => {
            const id = s.timeline.selectedUoW
            if (!id) return undefined
            return s.currentExecution?.recording?.units[id]
        },
        getSnapshotedNode: (s, nodeId) => {
            return s.currentExecution?.recording?.workflowDataSnapshot?.nodes[nodeId]
        },
        getDatabank: (s) => {
            return s.currentExecution?.recording?.dataBank
        },
    },
    currentExecution: {
        isRunning: (s) => s.currentExecution?.status === "running",
        running: {
            isRecording: (s) => {
                const value = s.currentExecution?.status === "running" && s.currentExecution.igniter.record
                return value ?? false
            },
            isDebugging: (s) => {
                const value = s.currentExecution?.status === "running" && s.currentExecution.igniter.debug
                return value ?? false
            }
        },
    }
} satisfies ExecutionSDKSelectors

export interface ExecutionSDKSelectors {
    getNodeStatus:    (state: ExecutionSDK.State, nodeId: Workflow.Node.Id) => Execution.Session.NodeStatus
    getEdgeStatus:    (state: ExecutionSDK.State, edgeId: Workflow.Edge.Id) => Execution.Session.EdgeState
    getEdgeItemCount: (state: ExecutionSDK.State, sourceNodeId: Workflow.Node.Id, sourcePortId: Foundations.Port.Output.Id) => number | undefined
    recording: {
        get:               (state: ExecutionSDK.State) => Execution.Recording | null
        getUoW:            (state: ExecutionSDK.State, id: Execution.Recording.UnitOfWork.Id) => Execution.Recording.UnitOfWork | undefined
        getTrack:          (state: ExecutionSDK.State, trackId: Workflow.Node.Id) => Execution.Recording.Track | undefined
        getUnits:          (state: ExecutionSDK.State) => Record<Execution.Recording.UnitOfWork.Id, Execution.Recording.UnitOfWork> | undefined
        getRelations:      (state: ExecutionSDK.State) => Record<Execution.Recording.Relation.Id, Execution.Recording.Relation> | undefined
        getSelectedUoW:    (state: ExecutionSDK.State) => Execution.Recording.UnitOfWork | undefined
        getSnapshotedNode: (state: ExecutionSDK.State, nodeId: Workflow.Node.Id) => Workflow.Node.Raw | undefined
        getDatabank:       (state: ExecutionSDK.State) => Execution.Recording.DataBank | undefined
    }
    currentExecution: {
        isRunning: (state: ExecutionSDK.State) => boolean
        running: {
            isRecording: (state: ExecutionSDK.State) => boolean
            isDebugging: (state: ExecutionSDK.State) => boolean
        }
    }
}





export function getOrderedTracks(recording: Execution.Recording | null): Execution.Recording.Track[] {
    if (!recording) return [];
    return Object.values(recording.tracks)
        .filter(t => t.unitIds.length > 0)
        .sort((a, b) => {
            const aStart = recording.units[a.unitIds[0]]?.startedAt ?? 0;
            const bStart = recording.units[b.unitIds[0]]?.startedAt ?? 0;
            return aStart - bStart;
        });
}

export function getTotalDuration(recording: Execution.Recording | null): number {
    if (!recording) return 0;
    const units = Object.values(recording.units);
    if (units.length === 0) return 0;
    return Math.max(...units.map(u => u.startedAt + (u.duration ?? 0)));
}

// ─── Timeline layout ────────────────────────────────────────────────────────
// Track height comes from the node's declared port count so it's stable
// from the start of execution, not derived from relations (which stream in
// over time). Layout is pure geometry keyed by trackId — it grows only when a
// track is born, never on a unit/status tick (those re-render via slice
// subscriptions on the track / unit). It is maintained on ExecutionSDK state;
// this builder is the one-shot rebuild for the non-live load path.

export interface TimelineTrackLayout {
    trackId:     Workflow.Node.Id
    top:         number
    height:      number   // total row height including TRACK_PADDING_Y × 2
    blockHeight: number   // UoW block height = rows × UOW_PORT_HEIGHT (no padding)
    inputPorts:  Foundations.Port.Input.Id[]
    outputPorts: Foundations.Port.Output.Id[]
}

export interface TimelineLayout {
    tracks:       TimelineTrackLayout[]
    byTrackId:    Map<Workflow.Node.Id, TimelineTrackLayout>
    totalHeight:  number
}

export const emptyTimelineLayout = (): TimelineLayout => ({ tracks: [], byTrackId: new Map(), totalHeight: 0 })

// Geometry for a single track row, from the node's declared port count.
export function buildTrackLayout(
    trackId: Workflow.Node.Id,
    top:     number,
    nodes:   Record<Workflow.Node.Id, Workflow.Node.Raw>,
): TimelineTrackLayout {    
    const inputPorts  = WorkbenchSDK.state.selectors.node.getInputs(WorkbenchSDK.state, trackId).map(p => p.id) ?? []
    const outputPorts = WorkbenchSDK.state.selectors.node.getOutputs(WorkbenchSDK.state, trackId).map(p => p.id) ?? []

    const rows        = Math.max(1, inputPorts.length, outputPorts.length)
    const blockHeight = rows * Execution.Recording.Timeline.UOW_PORT_HEIGHT
    const height      = blockHeight + Execution.Recording.Timeline.TRACK_PADDING_Y * 2
    return { trackId, top, height, blockHeight, inputPorts, outputPorts }
}

export function getTimelineLayout(
    recording: Execution.Recording | null,
    nodes:     Record<Workflow.Node.Id, Workflow.Node.Raw>,
): TimelineLayout {
    const layout = emptyTimelineLayout()
    if (!recording) return layout

    for (const track of getOrderedTracks(recording)) {
        const row = buildTrackLayout(track.id, layout.totalHeight, nodes)
        layout.tracks.push(row)
        layout.byTrackId.set(track.id, row)
        layout.totalHeight = row.top + row.height
    }
    return layout
}

// Nodes feeding the timeline: the execution's frozen snapshot if populated,
// else the live workbench graph (during a live run the snapshot may be empty).
export function resolveTimelineNodes(
    recording:     Execution.Recording | null,
    workbenchNodes: Record<Workflow.Node.Id, Workflow.Node.Raw>,
): Record<Workflow.Node.Id, Workflow.Node.Raw> {
    const snapshot = recording?.workflowDataSnapshot?.nodes
    return (snapshot && Object.keys(snapshot).length > 0) ? snapshot : workbenchNodes
}