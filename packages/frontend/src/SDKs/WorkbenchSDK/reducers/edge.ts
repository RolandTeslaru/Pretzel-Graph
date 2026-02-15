import type { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import type { Connection } from "@xyflow/react";
import { cacheReducers } from "./cache";

export const edgeReducers = {
    add: (s, edgeId, conn) => {
        s.isDirty = true;
        const { source: sourceNodeId, sourceHandle, target: targetNodeId, targetHandle } = conn as {
            source: Workflow.Node.Id,
            sourceHandle: Foundations.Port.Output.Id,
            target: Workflow.Node.Id,
            targetHandle: Foundations.Port.Input.Id
        }
        if (!sourceHandle || !targetHandle || !sourceNodeId || !targetNodeId) return;

        const edges = s.workflow.data.edges

        if (edges[edgeId])
            return

        const newEdge: Workflow.Edge = {
            id: edgeId,
            source: {
                nodeId: sourceNodeId,
                portId: sourceHandle
            },
            target: {
                nodeId: targetNodeId,
                portId: targetHandle
            }
        }

        edges[edgeId] = newEdge

        cacheReducers.addEdge(s, newEdge)
    },
    remove: (s, edgeId) => {
        s.isDirty = true;
        const edges = s.workflow.data.edges

        const edge = edges[edgeId];
        if (!edge) return;

        delete edges[edgeId];

        cacheReducers.deleteEdge(s, edge);
    },
    createId: (_sourceNodeId, _sourcePortId, _targetNodeId, _targetPortId) => {
        return `${_sourceNodeId}|${_sourcePortId}|${_targetNodeId}|${_targetPortId}` as Workflow.Edge.Id
    }
} satisfies EdgeReducers;

type EdgeReducers = {
    add: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id, conn: Connection) => void
    remove: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id) => void
    createId: (
        sourceNodeId: Workflow.Node.Id, 
        sourcePortId: Foundations.Port.Output.Id, 
        targetNodeId: Workflow.Node.Id, 
        targetPortId: Foundations.Port.Input.Id
    ) => Workflow.Edge.Id
}