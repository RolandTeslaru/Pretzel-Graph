import { Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cacheReducers } from "./cache";
import { inputReducers } from "./input";
import { workbenchSelectors } from "../selectors"
import { nodeReducers } from "./node";
import { Port } from "@vx-agent-editor/shared/domain/Foundations/Port";

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
       
        const targetPort = sel.input.get(s, targetNodeId, targetPortId);
        if (!targetPort) 
            return;

        const sourcePort = sel.output.get(s, sourceNodeId, sourcePortId);
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

        if (Port.isPolymorphic(targetPort))
            nodeReducers.resolvePolymorphicPortGroup(s, targetNodeId, targetPort, sourcePort.variant);

        else if (Port.isPolymorphic(sourcePort))
            nodeReducers.resolvePolymorphicPortGroup(s, sourceNodeId, sourcePort, targetPort.variant);

        return newEdge
    },
    remove: (s, edgeId) => {
        s.isDirty = true;
        const edges = s.workflow.data.edges

        const edge = edges[edgeId];
        if (!edge) return;

        const sourcePort = sel.output.get(s, edge.source.nodeId, edge.source.portId);
        const targetPort = sel.input.get(s, edge.target.nodeId, edge.target.portId);

        if(!sourcePort || !targetPort){
            throw new Error(`Ports for edge ${edgeId} not found. Source port: ${edge.source.nodeId}:${edge.source.portId}, Target port: ${edge.target.nodeId}:${edge.target.portId}`)
            return
        }

        delete edges[edgeId];

        cacheReducers.deleteEdge(s, edge);

        if (targetPort)
            inputReducers.validate(s, edge.target.nodeId, targetPort);

        // Unresolve dynamic sync groups if no edges remain
        if (Port.isPolymorphic(targetPort) && targetPort.polymorphicGroupId) {
            if (!sel.port.syncGroupHasEdges(s, edge.target.nodeId, targetPort.polymorphicGroupId))
                nodeReducers.unresolvePolymorphicPortGroup(s, edge.target.nodeId, targetPort.polymorphicGroupId);
        }
        if (Port.isPolymorphic(sourcePort) && sourcePort.polymorphicGroupId) {
            if (!sel.port.syncGroupHasEdges(s, edge.source.nodeId, sourcePort.polymorphicGroupId))
                nodeReducers.unresolvePolymorphicPortGroup(s, edge.source.nodeId, sourcePort.polymorphicGroupId);
        }
    },
    createId: Workflow.Edge.createId
} satisfies EdgeReducers;

type EdgeReducers = {
    create: (state: WorkbenchSDK.State, conn: WorkbenchSDK.DriverConnection) => Workflow.Edge | undefined
    remove: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id) => void
    createId: typeof Workflow.Edge.createId
}

