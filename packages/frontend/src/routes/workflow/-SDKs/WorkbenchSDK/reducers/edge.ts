import { Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cacheReducers } from "./cache";
import { inputReducers } from "./input";
import { nodeReducers } from "./node";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { nodeSelectors } from "../selectors/node";

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

        const sourceNode = s.data.nodes[sourceNodeId];
        const targetNode = s.data.nodes[targetNodeId];
        
        const sourceOutputs = nodeSelectors.getOutputs(s, sourceNodeId);
        const targetInputs = nodeSelectors.getInputs(s, targetNodeId);

        const sourcePort = sourceOutputs.find(o => o.id === sourcePortId);
        const targetPort = targetInputs.find(i => i.id === targetPortId);

        
        if (!sourcePort || !targetPort){
            console.error(`Cannot create edge, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
            return
            // throw new Error(`Cannot create edge, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
        }
        
        const isFirstArcBetweenNodes = s.selectors.graph.hasArcBetween(s, sourceNodeId, targetNodeId) === false; 

        const edgeId = edgeReducers.createId(sourceNodeId, sourcePortId, targetNodeId, targetPortId)
        
        const edges = s.data.edges

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
            s.selectors.node.isSourceNode(s, sourceNodeId) === false && 
            s.selectors.node.isSinkNode(s, targetNodeId) === false &&
            isFirstArcBetweenNodes
        )
            if(doesCycleExistBetweenNodes(sourceNodeId, targetNodeId, s.cache))
                s.cyclesDirty = true;

        if (Port.isPolymorphic(targetPort) && !Port.isUnresolvedLike(sourcePort.variant))
            nodeReducers.polymorphism.resolveGroup(s, targetNodeId, targetPort, sourcePort.variant);

        else if (Port.isPolymorphic(sourcePort) && !Port.isUnresolvedLike(targetPort.variant))
            nodeReducers.polymorphism.resolveGroup(s, sourceNodeId, sourcePort, targetPort.variant);

        return newEdge
    },
    remove: (s, edgeId) => {
        s.isDirty = true;
        const edges = s.data.edges

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

        const sourceNode = s.data.nodes[sourceNodeId]!;
        const targetNode = s.data.nodes[targetNodeId]!;

        const sourceOutputs = nodeSelectors.getOutputs(s, sourceNodeId);
        const targetInputs = nodeSelectors.getInputs(s, targetNodeId);

        const sourcePort = sourceOutputs.find(o => o.id === sourcePortId);
        const targetPort = targetInputs.find(i => i.id === targetPortId);

        if(!sourcePort || !targetPort)
            throw new Error(`Cannot remove edge ${edgeId}, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)

        if (targetNode && targetPort)
            inputReducers.validate(s, targetNodeId, targetPort);

        // Connecting two leafs, recompute and validate cycles
        if(
            s.selectors.node.isSourceNode(s, sourceNodeId) === false && 
            s.selectors.node.isSinkNode(s, targetNodeId) === false &&
            s.selectors.graph.hasArcBetween(s, sourceNodeId, targetNodeId) === false
        )
            if(didCycleExist)
                s.cyclesDirty = true;

        // Unresolve polymorphic groups if no edges remain
        if (Port.isPolymorphic(targetPort) && targetPort.polymorphicGroupId)
            if (!s.selectors.port.polymorphism.groupHasEdges(s, targetNodeId, targetPort.polymorphicGroupId))
                nodeReducers.polymorphism.unresolveGroup(s, targetNodeId, targetPort.polymorphicGroupId);

        if (Port.isPolymorphic(sourcePort) && sourcePort.polymorphicGroupId)
            if (!s.selectors.port.polymorphism.groupHasEdges(s, sourceNodeId, sourcePort.polymorphicGroupId))
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

