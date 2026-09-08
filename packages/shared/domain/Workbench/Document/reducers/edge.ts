import { Workflow } from "../../../Workflow";
import type { Document } from "../index";
import { Port } from "../../../Foundations/Port";

// TODO: rename handles to ports
export const edgeReducers: EdgeReducers = {
    create: (d, conn) => {
        d.isDirty = true;
        
        const { 
            source: sourceNodeId, 
            sourceHandle: sourcePortId, 
            target: targetNodeId, 
            targetHandle: targetPortId
        } = conn
        
        if (!sourcePortId || !targetPortId || !sourceNodeId || !targetNodeId) 
            throw new Error(`Invalid edge connection. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`);
        
        const sourceOutputs = d.selectors.node.getOutputs(d, sourceNodeId);
        const targetInputs = d.selectors.node.getInputs(d, targetNodeId);

        const sourcePort = sourceOutputs.find(o => o.id === sourcePortId);
        const targetPort = targetInputs.find(i => i.id === targetPortId);

        
        if (!sourcePort || !targetPort){
            console.error(`Cannot create edge, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
            return
            // throw new Error(`Cannot create edge, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
        }
        
        const isFirstArcBetweenNodes = d.selectors.graph.hasArcBetween(d, sourceNodeId, targetNodeId) === false; 

        const edgeId = edgeReducers.createId(sourceNodeId, sourcePortId, targetNodeId, targetPortId)

        if (d.cache.edges[edgeId])
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

        d.data.edges.push(edgeId)

        d.reducers.cache.addEdge(d, newEdge)

        d.reducers.input.validate(d, targetNodeId, targetPort);

        if(
            d.selectors.node.isSourceNode(d, sourceNodeId) === false && 
            d.selectors.node.isSinkNode(d, targetNodeId) === false &&
            isFirstArcBetweenNodes
        )
            if(doesCycleExistBetweenNodes(sourceNodeId, targetNodeId, d.cache))
                d.cyclesDirty = true;

        if (Port.isPolymorphic(targetPort) && !Port.isUnresolvedLike(sourcePort.variant))
            d.reducers.node.polymorphism.resolveGroup(d, targetNodeId, targetPort, sourcePort.variant);

        else if (Port.isPolymorphic(sourcePort) && !Port.isUnresolvedLike(targetPort.variant))
            d.reducers.node.polymorphism.resolveGroup(d, sourceNodeId, sourcePort, targetPort.variant);

        return newEdge
    },
    remove: (d, edgeId) => {
        d.isDirty = true;

        const edge = d.cache.edges[edgeId];
        if (!edge)
            throw new Error(`Cannot remove edge ${edgeId}, edge not found.`)

        const didCycleExist = doesCycleExistBetweenNodes(edge.source.nodeId, edge.target.nodeId, d.cache)


        // Always remove the edge + cache references first. Port/node lookups can
        // fail (e.g. during node deletion/recreate/reconcile), but cache must stay consistent.
        const idx = d.data.edges.indexOf(edgeId);
        if (idx !== -1) d.data.edges.splice(idx, 1);
        d.reducers.cache.deleteEdge(d, edge);

        const sourceNodeId = edge.source.nodeId;
        const sourcePortId = edge.source.portId;
        const targetNodeId = edge.target.nodeId;
        const targetPortId = edge.target.portId;

        const sourceNode = d.data.nodes[sourceNodeId]!;
        const targetNode = d.data.nodes[targetNodeId]!;

        const sourceOutputs = d.selectors.node.getOutputs(d, sourceNodeId);
        const targetInputs = d.selectors.node.getInputs(d, targetNodeId);

        const sourcePort = sourceOutputs.find(o => o.id === sourcePortId);
        const targetPort = targetInputs.find(i => i.id === targetPortId);

        if(!sourcePort || !targetPort){
            // throw new Error(`Cannot remove edge ${edgeId}, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
            console.warn(`Cannot remove edge ${edgeId}, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
            return
        }

        if (targetNode && targetPort)
            d.reducers.input.validate(d, targetNodeId, targetPort);

        // Connecting two leafs, recompute and validate cycles
        if(
            d.selectors.node.isSourceNode(d, sourceNodeId) === false && 
            d.selectors.node.isSinkNode(d, targetNodeId) === false &&
            d.selectors.graph.hasArcBetween(d, sourceNodeId, targetNodeId) === false
        )
            if(didCycleExist)
                d.cyclesDirty = true;

        // Unresolve polymorphic groups if no edges remain
        if (Port.isPolymorphic(targetPort) && targetPort.polymorphicGroupId)
            if (!d.selectors.port.polymorphism.groupHasEdges(d, targetNodeId, targetPort.polymorphicGroupId))
                d.reducers.node.polymorphism.unresolveGroup(d, targetNodeId, targetPort.polymorphicGroupId);

        if (Port.isPolymorphic(sourcePort) && sourcePort.polymorphicGroupId)
            if (!d.selectors.port.polymorphism.groupHasEdges(d, sourceNodeId, sourcePort.polymorphicGroupId))
                d.reducers.node.polymorphism.unresolveGroup(d, sourceNodeId, sourcePort.polymorphicGroupId);
    },
    createId: Workflow.Edge.createId
}

type EdgeReducers = {
    create: (document: Document, conn: Document.DriverConnection) => Workflow.Edge | undefined
    remove: (document: Document, edgeId: Workflow.Edge.Id) => void
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
