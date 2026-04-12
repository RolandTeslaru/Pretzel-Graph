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
            throw new Error(`Invalid edge connection. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`);

        const sourceNode = s.workflow.data.nodes[sourceNodeId];
        const targetNode = s.workflow.data.nodes[targetNodeId];
        
        const sourcePort = sourceNode.outputs.find(o => o.id === sourcePortId);
        const targetPort = targetNode.inputs.find(i => i.id === targetPortId);

        
        if (!sourcePort || !targetPort)
            throw new Error(`Cannot create edge, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
        
        const isFirstArcBetweenNodes = sel.graph.hasArcBetween(s, sourceNodeId, targetNodeId) === false; 

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
            sel.node.isSinkNode(s, targetNodeId) === false &&
            isFirstArcBetweenNodes
        )
            if(doesCycleExistBetweenNodes(sourceNodeId, targetNodeId, s.cache))
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

        const didCycleExist = doesCycleExistBetweenNodes(edge.source.nodeId, edge.target.nodeId, s.cache)


        // Always remove the edge + cache references first. Port/node lookups can
        // fail (e.g. during node deletion/recreate/reconcile), but cache must stay consistent.
        delete edges[edgeId];
        cacheReducers.deleteEdge(s, edge);

        const sourceNodeId = edge.source.nodeId;
        const sourcePortId = edge.source.portId;
        const targetNodeId = edge.target.nodeId;
        const targetPortId = edge.target.portId;

        const sourceNode = s.workflow.data.nodes[sourceNodeId];
        const targetNode = s.workflow.data.nodes[targetNodeId];

        const sourcePort = sourceNode?.outputs.find(o => o.id === sourcePortId);
        const targetPort = targetNode?.inputs.find(i => i.id === targetPortId);

        if (targetNode && targetPort)
            inputReducers.validate(s, targetNodeId, targetPort);

        // Connecting two leafs, recompute and validate cycles
        if(
            sel.node.isSourceNode(s, sourceNodeId) === false && 
            sel.node.isSinkNode(s, targetNodeId) === false &&
            sel.graph.hasArcBetween(s, sourceNodeId, targetNodeId) === false
        )
            if(didCycleExist)
                s.cyclesDirty = true;

        // Unresolve polymorphic groups if no edges remain
        if (targetPort && Port.isPolymorphic(targetPort) && targetPort.polymorphicGroupId)
            if (!sel.port.polymorphism.groupHasEdges(s, targetNodeId, targetPort.polymorphicGroupId))
                nodeReducers.polymorphism.unresolveGroup(s, targetNodeId, targetPort.polymorphicGroupId);

        if (sourcePort && Port.isPolymorphic(sourcePort) && sourcePort.polymorphicGroupId)
            if (!sel.port.polymorphism.groupHasEdges(s, sourceNodeId, sourcePort.polymorphicGroupId))
                nodeReducers.polymorphism.unresolveGroup(s, sourceNodeId, sourcePort.polymorphicGroupId);
    },
    createId: Workflow.Edge.createId
} satisfies EdgeReducers;

type EdgeReducers = {
    create: (state: WorkbenchSDK.State, conn: WorkbenchSDK.DriverConnection) => Workflow.Edge | undefined
    remove: (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id) => void
    createId: typeof Workflow.Edge.createId
}


function doesCycleExistBetweenNodes(sourceNodeId: Workflow.Node.Id, targetNodeId: Workflow.Node.Id, cache: Workflow.Cache){
    const visited = new Set<Workflow.Node.Id>()

    const queue: Workflow.Node.Id[] = [targetNodeId]
    visited.add(targetNodeId)

    let head = 0;

    while(head < queue.length){
        const nodeId = queue[head ++];

        const outgoindNodesMap = cache.outgoingEdgesMap[nodeId]
        
        for (const _nextId in outgoindNodesMap){
            const nextId = _nextId as Workflow.Node.Id
            
            if(nextId === sourceNodeId)
                return true;

            if(visited.has(nextId))
                continue;
            
            visited.add(nextId);
            queue.push(nextId);
        }   
    }

    return false;
}

