import type { Execution, Foundations, Workflow } from "@pretzel-graph/shared/domain"
import { Recording } from "@pretzel-graph/shared/domain"
import type { ExecutionSDK } from "./sdk"

export const executionSDKSelectors = {
    getNodeStatus: (s, nodeId) => {
        return s.currentExecution?.session.node_status?.[nodeId] ?? { status: "idle" }
    },
    getEdgeStatus: (s, edgeId) => {
        return s.currentExecution?.session.edge_state?.[edgeId] ?? { status: "idle", runCount: 0 }
    },
    getEdgeItemCount: (s, sourceNodeId, sourcePortId) => {
        const projection = s.currentExecution?.session.node_output_projections[sourceNodeId]?.[sourcePortId]
        return Array.isArray(projection) ? projection.length : undefined
    },
} satisfies ExecutionSDKSelectors

export interface ExecutionSDKSelectors {
    getNodeStatus:    (state: ExecutionSDK.State, nodeId: Workflow.Node.Id) => Execution.Session.NodeStatus
    getEdgeStatus:    (state: ExecutionSDK.State, edgeId: Workflow.Edge.Id) => Execution.Session.EdgeState
    getEdgeItemCount: (state: ExecutionSDK.State, sourceNodeId: Workflow.Node.Id, sourcePortId: Foundations.Port.Output.Id) => number | undefined
}

export function getOrderedTracks(recording: Recording | null): Recording.Track[] {
    if (!recording) return [];
    return Object.values(recording.tracks)
        .filter(t => t.unitIds.length > 0)
        .sort((a, b) => {
            const aStart = recording.units[a.unitIds[0]]?.startedAt ?? 0;
            const bStart = recording.units[b.unitIds[0]]?.startedAt ?? 0;
            return aStart - bStart;
        });
}

export function getTotalDuration(recording: Recording | null): number {
    if (!recording) return 0;
    const units = Object.values(recording.units);
    if (units.length === 0) return 0;
    return Math.max(...units.map(u => u.startedAt + (u.duration ?? 0)));
}

// ─── Timeline layout ────────────────────────────────────────────────────────
// Track height comes from the node's declared port count so it's stable
// from the start of execution, not derived from relations (which stream in
// over time).

export interface TimelineTrackLayout {
    track:       Recording.Track
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

export function getTimelineLayout(
    recording: Recording | null,
    nodes:     Record<Workflow.Node.Id, Workflow.Node>,
): TimelineLayout {
    if (!recording) {
        return { tracks: [], byTrackId: new Map(), totalHeight: 0 }
    }

    const ordered = getOrderedTracks(recording)

    let top = 0
    const tracks: TimelineTrackLayout[] = []
    const byTrackId = new Map<Workflow.Node.Id, TimelineTrackLayout>()

    for (const track of ordered) {
        const node        = nodes[track.id]
        const inputPorts  = node?.inputs.map(p => p.id)  ?? []
        const outputPorts = node?.outputs.map(p => p.id) ?? []

        const rows        = Math.max(1, inputPorts.length, outputPorts.length)
        const blockHeight = rows * Recording.Timeline.UOW_PORT_HEIGHT
        const height      = blockHeight + Recording.Timeline.TRACK_PADDING_Y * 2

        const layout: TimelineTrackLayout = { track, top, height, blockHeight, inputPorts, outputPorts }
        tracks.push(layout)
        byTrackId.set(track.id, layout)
        top += height
    }

    return { tracks, byTrackId, totalHeight: top }
}