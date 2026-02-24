import type { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cacheReducers } from "./cache";
import { inputReducers } from "./input";
import { workbenchSelectors } from "../selectors"

const sel = workbenchSelectors

export const edgeReducers = {
    create: (s, conn) => {
        s.isDirty = true;
        
        const { 
            source: sourceNodeId, 
            sourceHandle, 
            target: targetNodeId, 
            targetHandle 
        } = conn
        
        if (!sourceHandle || !targetHandle || !sourceNodeId || !targetNodeId) 
            return;
       
        const targetInput = sel.getInput(s, targetNodeId, targetHandle);
        if (!targetInput) 
            return;
        
        const edgeId = edgeReducers.createId(sourceNodeId, sourceHandle, targetNodeId, targetHandle)

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

        inputReducers.validate(s, targetNodeId, targetInput);

        return newEdge
    },
    remove: (s, edgeId) => {
        s.isDirty = true;
        const edges = s.workflow.data.edges

        const edge = edges[edgeId];
        if (!edge) return;

        delete edges[edgeId];

        cacheReducers.deleteEdge(s, edge);

        const input = sel.getInput(s, edge.target.nodeId, edge.target.portId)
        if (!input) return;

        inputReducers.validate(s, edge.target.nodeId, input);
    },
    createId: (_sourceNodeId, _sourcePortId, _targetNodeId, _targetPortId) => {
        return `${_sourceNodeId}|${_sourcePortId}|${_targetNodeId}|${_targetPortId}` as Workflow.Edge.Id
    }
} satisfies EdgeReducers;

type EdgeReducers = {
    create: (state: WorkbenchSDK.State, conn: WorkbenchSDK.DriverConnection) => Workflow.Edge | undefined
    remove: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id) => void
    createId: (
        sourceNodeId: Workflow.Node.Id, 
        sourcePortId: Foundations.Port.Output.Id, 
        targetNodeId: Workflow.Node.Id, 
        targetPortId: Foundations.Port.Input.Id
    ) => Workflow.Edge.Id
}


