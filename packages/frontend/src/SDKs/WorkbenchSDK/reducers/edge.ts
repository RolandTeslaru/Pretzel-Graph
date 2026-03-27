import { Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cacheReducers } from "./cache";
import { inputReducers } from "./input";
import { workbenchSelectors } from "../selectors"
import { nodeReducers } from "./node";

const sel = workbenchSelectors

// TODO: rename handles to ports
export const edgeReducers = {
    create: (s, conn) => {
        s.isDirty = true;
        
        const { 
            source: sourceNodeId, 
            sourceHandle: sourcePortId, 
            target: targetNodeId, 
            targetHandle: targetPortId
        } = conn
        
        if (!sourcePortId || !targetPortId || !sourceNodeId || !targetNodeId) 
            return;
       
        const targetPort = sel.getInput(s, targetNodeId, targetPortId);
        if (!targetPort) 
            return;

        const sourcePort = sel.getOutput(s, sourceNodeId, sourcePortId);
        if (!sourcePort)
            return

        const edgeId = edgeReducers.createId(sourceNodeId, sourcePortId, targetNodeId, targetPortId)

        const edges = s.workflow.data.edges

        if (edges[edgeId])
            return

        const newEdge: Workflow.Edge = {
            id: edgeId,
            source: {
                nodeId: sourceNodeId,
                portId: sourcePortId
            },
            target: {
                nodeId: targetNodeId,
                portId: targetPortId
            }
        }

        edges[edgeId] = newEdge

        cacheReducers.addEdge(s, newEdge)

        inputReducers.validate(s, targetNodeId, targetPort);

        if (targetPort.isDynamic && (targetPort.variant === "Unresolved" || targetPort.variant === "UnresolvedList")) {
            nodeReducers.resolveDynamicPortGroup(s, targetNodeId, targetPort, sourcePort.variant);
        }
        else if (sourcePort.isDynamic && (sourcePort.variant === "Unresolved" || sourcePort.variant === "UnresolvedList")) {
            nodeReducers.resolveDynamicPortGroup(s, sourceNodeId, sourcePort, targetPort.variant);
        }
        return newEdge
    },
    remove: (s, edgeId) => {
        s.isDirty = true;
        const edges = s.workflow.data.edges

        const edge = edges[edgeId];
        if (!edge) return;

        const sourcePort = sel.getOutput(s, edge.source.nodeId, edge.source.portId);
        const targetPort = sel.getInput(s, edge.target.nodeId, edge.target.portId);

        delete edges[edgeId];

        cacheReducers.deleteEdge(s, edge);

        if (targetPort)
            inputReducers.validate(s, edge.target.nodeId, targetPort);

        // Unresolve dynamic sync groups if no edges remain
        if (targetPort?.isDynamic && targetPort.syncGroupId) {
            if (!sel.syncGroupHasEdges(s, edge.target.nodeId, targetPort.syncGroupId))
                nodeReducers.unresolveDynamicPortGroup(s, edge.target.nodeId, targetPort.syncGroupId);
        }
        if (sourcePort?.isDynamic && sourcePort.syncGroupId) {
            if (!sel.syncGroupHasEdges(s, edge.source.nodeId, sourcePort.syncGroupId))
                nodeReducers.unresolveDynamicPortGroup(s, edge.source.nodeId, sourcePort.syncGroupId);
        }
    },
    createId: Workflow.Edge.createId
} satisfies EdgeReducers;

type EdgeReducers = {
    create: (state: WorkbenchSDK.State, conn: WorkbenchSDK.DriverConnection) => Workflow.Edge | undefined
    remove: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id) => void
    createId: typeof Workflow.Edge.createId
}


