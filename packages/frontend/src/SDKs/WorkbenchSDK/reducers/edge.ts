import { Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cacheReducers } from "./cache";
import { inputReducers } from "./input";
import { workbenchSelectors } from "../selectors"
import { nodeReducers } from "./node";
import { Port } from "@vx-agent-editor/shared/domain/Foundations/Port";
import { Algorithms } from "@vx-agent-editor/shared/domain/Algorithms";
import { workflowReducers } from "./workflow";

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
            throw new Error(`Invalid edge connection. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`);

        const sourceNode = s.workflow.data.nodes[sourceNodeId];
        const targetNode = s.workflow.data.nodes[targetNodeId];
        
        const sourcePort = sourceNode.outputs.find(o => o.id === sourcePortId);
        const targetPort = targetNode.inputs.find(i => i.id === targetPortId);

        if (!sourcePort || !targetPort)
            throw new Error(`Cannot create edge, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)

        const edgeId = edgeReducers.createId(sourceNodeId, sourcePortId, targetNodeId, targetPortId)

        const edges = s.workflow.data.edges

        if (edges[edgeId])
            throw new Error(`Edge ${edgeId} already exists. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)

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

        if(
            sel.node.isSourceNode(s, sourceNodeId) === false && 
            sel.node.isSinkNode(s, targetNodeId) === false
        )
            s.cyclesDirty = true;

        if (Port.isPolymorphic(targetPort))
            nodeReducers.polymorphism.resolveGroup(s, targetNodeId, targetPort, sourcePort.variant);

        else if (Port.isPolymorphic(sourcePort))
            nodeReducers.polymorphism.resolveGroup(s, sourceNodeId, sourcePort, targetPort.variant);

        return newEdge
    },
    remove: (s, edgeId) => {
        s.isDirty = true;
        const edges = s.workflow.data.edges

        const edge = edges[edgeId];
        if (!edge)
            throw new Error(`Cannot remove edge ${edgeId}, edge not found.`)

        const sourceNode = s.workflow.data.nodes[edge.source.nodeId];
        const targetNode = s.workflow.data.nodes[edge.target.nodeId];

        const sourcePort = sourceNode.outputs.find(o => o.id === edge.source.portId);
        const targetPort = targetNode.inputs.find(i => i.id === edge.target.portId);

        if(!sourcePort || !targetPort)
            throw new Error(`Ports for edge ${edgeId} not found. Source port: ${edge.source.nodeId}:${edge.source.portId}, Target port: ${edge.target.nodeId}:${edge.target.portId}`)

        delete edges[edgeId];

        cacheReducers.deleteEdge(s, edge);

        inputReducers.validate(s, edge.target.nodeId, targetPort);

        // Connecting two leafs, recompute and validate cycles
        if(
            sel.node.isSourceNode(s, edge.source.nodeId) === false && 
            sel.node.isSinkNode(s, edge.target.nodeId) === false
        )
            s.cyclesDirty = true;

        // Unresolve polymorphic groups if no edges remain
        if (Port.isPolymorphic(targetPort) && targetPort.polymorphicGroupId)
            if (!sel.port.polymorphism.groupHasEdges(s, edge.target.nodeId, targetPort.polymorphicGroupId))
                nodeReducers.polymorphism.unresolveGroup(s, edge.target.nodeId, targetPort.polymorphicGroupId);

        if (Port.isPolymorphic(sourcePort) && sourcePort.polymorphicGroupId)
            if (!sel.port.polymorphism.groupHasEdges(s, edge.source.nodeId, sourcePort.polymorphicGroupId))
                nodeReducers.polymorphism.unresolveGroup(s, edge.source.nodeId, sourcePort.polymorphicGroupId);
    },
    createId: Workflow.Edge.createId
} satisfies EdgeReducers;

type EdgeReducers = {
    create: (state: WorkbenchSDK.State, conn: WorkbenchSDK.DriverConnection) => Workflow.Edge | undefined
    remove: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id) => void
    createId: typeof Workflow.Edge.createId
}

