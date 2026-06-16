import type { Foundations, Validation, Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDK } from "../sdk"
import { MarkerType } from "@xyflow/react";

export function createNodeDriver(node: Workflow.Node, wfData: Workflow.Data): WorkbenchSDK.NodeDriver {
    return {
        id: node.id,
        type: "workflowNode",
        position: wfData.ui.layout[node.id] ?? { x: 0, y: 0 },
        data: {},
    }
}

export function createEdgeDriver(edge: Workflow.Edge, wfData: Workflow.Data): WorkbenchSDK.EdgeDriver | null {
    const node = wfData.nodes[edge.source.nodeId]
    const output = node?.outputs.find((o: Foundations.Port.Output) => o.id === edge.source.portId);

    if (!output)
        return null

    return {
        id: edge.id,
        type: "workflowEdge",
        source: edge.source.nodeId,
        sourceHandle: edge.source.portId,
        target: edge.target.nodeId,
        targetHandle: edge.target.portId,
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color: `var(--port-${output.variant})`,
            width: 15,
            height: 15
        }
    }
}

export function createDrivers(wfData: Workflow.Data) {
    const nodeDrivers = Object.values(wfData.nodes).map(node => createNodeDriver(node, wfData))
    const edgeDrivers = Object.values(wfData.edges)
        .map(edge => createEdgeDriver(edge, wfData))
        .filter((d): d is WorkbenchSDK.EdgeDriver => d !== null)

    return { nodeDrivers, edgeDrivers }
}

// Reconcile existing XYFlow drivers to match the store, preserving the identity of
// anything unchanged. Crucially, an unchanged edge keeps its exact object reference so
// XYFlow never re-renders/remounts it — edge animations survive node moves/creates/undo.

export function reconcileNodeDrivers(
    prev: WorkbenchSDK.NodeDriver[],
    wfData: Workflow.Data
): WorkbenchSDK.NodeDriver[] {
    const prevById = new Map(prev.map(n => [n.id, n]))
    let changed = false

    const next = Object.values(wfData.nodes).map(node => {
        const existing = prevById.get(node.id)
        const pos = wfData.ui.layout[node.id] ?? { x: 0, y: 0 }

        if (!existing) {
            changed = true
            return createNodeDriver(node, wfData)
        }
        if (existing.position.x !== pos.x || existing.position.y !== pos.y) {
            changed = true
            return { ...existing, position: pos }
        }
        return existing
    })

    // Detect removals / reordering as well.
    if (next.length !== prev.length) changed = true

    return changed ? next : prev
}

export function reconcileEdgeDrivers(
    prev: WorkbenchSDK.EdgeDriver[],
    wfData: Workflow.Data
): WorkbenchSDK.EdgeDriver[] {
    const prevById = new Map(prev.map(e => [e.id, e]))
    let changed = false

    const next = Object.values(wfData.edges)
        .map(edge => {
            const existing = prevById.get(edge.id)
            const sameTopology = existing
                && existing.source === edge.source.nodeId
                && existing.sourceHandle === edge.source.portId
                && existing.target === edge.target.nodeId
                && existing.targetHandle === edge.target.portId

            if (sameTopology) return existing

            changed = true
            return createEdgeDriver(edge, wfData)
        })
        .filter((d): d is WorkbenchSDK.EdgeDriver => d !== null)

    if (next.length !== prev.length) changed = true

    return changed ? next : prev
}

const PADDING = 16;

export function createCycleSelectionDrivers(
    cycleIssues: Validation.Issue.Cycle[],
    wfData: Workflow.Data
): WorkbenchSDK.CycleSelectionNodeDriver[] {
    return cycleIssues.map((issue, i) => {

        let minX, minY, maxX, maxY;

        for (const nodeId of issue.nodes) {
            const pos = wfData.ui.layout[nodeId] ?? { x: 0, y: 0 };
            const el = document.querySelector<HTMLElement>(`[data-id="${nodeId}"]`);
            const w = el?.offsetWidth ?? 250;
            const h = el?.offsetHeight ?? 150;

            minX = !minX ? pos.x : Math.min(minX, pos.x);
            minY = !minY ? pos.y : Math.min(minY, pos.y);
            maxX = !maxX ? pos.x + w : Math.max(maxX, pos.x + w);
            maxY = !maxY ? pos.y + h : Math.max(maxY, pos.y + h);
        }

        return {
            id: `cycle-selection-${i}`,
            type: "cycleSelectionNode" as const,
            position: { x: minX! - PADDING, y: minY! - PADDING },
            data: {
                width: (maxX! - minX!) + PADDING * 2,
                height: (maxY! - minY!) + PADDING * 2,
                nodeIds: issue.nodes,
                issue,
            },
            zIndex: -1,
            selectable: false,
            draggable: false,
        }
    });
}
