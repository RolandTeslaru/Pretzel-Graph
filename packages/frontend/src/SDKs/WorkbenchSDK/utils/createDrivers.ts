import type { Foundations, Validation, Workflow } from "@vx-agent-editor/shared/domain"
import type { WorkbenchSDK } from "../sdk"
import { MarkerType } from "@xyflow/react";

export function createDrivers(wf: Workflow) {
    const nodeDrivers = [] as WorkbenchSDK.NodeDriver[]
    const edgeDrivers = [] as WorkbenchSDK.EdgeDriver[]

    Object.values(wf.data.nodes).forEach(node => {
        nodeDrivers.push({
            id: node.id,
            type: "workflowNode",
            position: wf.data.ui.layout[node.id] ?? { x: 0, y: 0 },
            data: {},
        })
    })

    Object.values(wf.data.edges).forEach(edge => {
        const node = wf.data.nodes[edge.source.nodeId]

        const output = node.outputs.find((o: Foundations.Port.Output) => o.id === edge.source.portId);

        if (!output)
            return

        edgeDrivers.push({
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
        })
    })

    return { nodeDrivers, edgeDrivers }
}

const PADDING = 16;

export function createCycleSelectionDrivers(
    cycleIssues: Validation.Issue.Cycle[],
    wf: Workflow
): WorkbenchSDK.CycleSelectionNodeDriver[] {
    return cycleIssues.map((issue, i) => {

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const nodeId of issue.nodes) {
            const pos = wf.data.ui.layout[nodeId] ?? { x: 0, y: 0 };
            const el = document.querySelector<HTMLElement>(`[data-id="${nodeId}"]`);
            const w = el?.offsetWidth ?? 250;
            const h = el?.offsetHeight ?? 150;

            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + w);
            maxY = Math.max(maxY, pos.y + h);
        }

        return {
            id: `cycle-selection-${i}`,
            type: "cycleSelectionNode" as const,
            position: { x: minX - PADDING, y: minY - PADDING },
            data: {
                width: (maxX - minX) + PADDING * 2,
                height: (maxY - minY) + PADDING * 2,
                nodeIds: issue.nodes,
                issue,
            },
            zIndex: -1,
            selectable: false,
            draggable: false,
        }
    });
}
