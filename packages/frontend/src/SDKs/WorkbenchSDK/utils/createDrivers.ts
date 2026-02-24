import type { Foundations, Workflow } from "@vx-agent-editor/shared/domain"
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