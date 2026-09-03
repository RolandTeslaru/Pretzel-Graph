import { Workflow } from "../../../Workflow";
import type { Document } from "../index";
import { Port } from "../../../Foundations/Port";

// TODO: rename handles to ports
export const edgeReducers: EdgeReducers = {
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
        
        const sourceOutputs = s.selectors.node.getOutputs(s, sourceNodeId);
        const targetInputs = s.selectors.node.getInputs(s, targetNodeId);

        const sourcePort = sourceOutputs.find(o => o.id === sourcePortId);
        const targetPort = targetInputs.find(i => i.id === targetPortId);

        
        if (!sourcePort || !targetPort){
            console.error(`Cannot create edge, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
            return
            // throw new Error(`Cannot create edge, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
        }
        
        const isFirstArcBetweenNodes = s.selectors.graph.hasArcBetween(s, sourceNodeId, targetNodeId) === false; 

        const edgeId = edgeReducers.createId(sourceNodeId, sourcePortId, targetNodeId, targetPortId)

        if (s.cache.edges[edgeId])
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

        s.data.edges.push(edgeId)

        s.reducers.cache.addEdge(s, newEdge)

        s.reducers.input.validate(s, targetNodeId, targetPort);

        if(
            s.selectors.node.isSourceNode(s, sourceNodeId) === false && 
            s.selectors.node.isSinkNode(s, targetNodeId) === false &&
            isFirstArcBetweenNodes
        )
            if(doesCycleExistBetweenNodes(sourceNodeId, targetNodeId, s.cache))
                s.cyclesDirty = true;

        if (Port.isPolymorphic(targetPort) && !Port.isUnresolvedLike(sourcePort.variant))
            s.reducers.node.polymorphism.resolveGroup(s, targetNodeId, targetPort, sourcePort.variant);

        else if (Port.isPolymorphic(sourcePort) && !Port.isUnresolvedLike(targetPort.variant))
            s.reducers.node.polymorphism.resolveGroup(s, sourceNodeId, sourcePort, targetPort.variant);

        return newEdge
    },
    remove: (s, edgeId) => {
        s.isDirty = true;

        const edge = s.cache.edges[edgeId];
        if (!edge)
            throw new Error(`Cannot remove edge ${edgeId}, edge not found.`)

        const didCycleExist = doesCycleExistBetweenNodes(edge.source.nodeId, edge.target.nodeId, s.cache)


        // Always remove the edge + cache references first. Port/node lookups can
        // fail (e.g. during node deletion/recreate/reconcile), but cache must stay consistent.
        const idx = s.data.edges.indexOf(edgeId);
        if (idx !== -1) s.data.edges.splice(idx, 1);
        s.reducers.cache.deleteEdge(s, edge);

        const sourceNodeId = edge.source.nodeId;
        const sourcePortId = edge.source.portId;
        const targetNodeId = edge.target.nodeId;
        const targetPortId = edge.target.portId;

        const sourceNode = s.data.nodes[sourceNodeId]!;
        const targetNode = s.data.nodes[targetNodeId]!;

        const sourceOutputs = s.selectors.node.getOutputs(s, sourceNodeId);
        const targetInputs = s.selectors.node.getInputs(s, targetNodeId);

        const sourcePort = sourceOutputs.find(o => o.id === sourcePortId);
        const targetPort = targetInputs.find(i => i.id === targetPortId);

        if(!sourcePort || !targetPort){
            // throw new Error(`Cannot remove edge ${edgeId}, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
            console.warn(`Cannot remove edge ${edgeId}, source or target port not found. Source: ${sourceNodeId}:${sourcePortId}, Target: ${targetNodeId}:${targetPortId}`)
            return
        }

        if (targetNode && targetPort)
            s.reducers.input.validate(s, targetNodeId, targetPort);

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
                s.reducers.node.polymorphism.unresolveGroup(s, targetNodeId, targetPort.polymorphicGroupId);

        if (Port.isPolymorphic(sourcePort) && sourcePort.polymorphicGroupId)
            if (!s.selectors.port.polymorphism.groupHasEdges(s, sourceNodeId, sourcePort.polymorphicGroupId))
                s.reducers.node.polymorphism.unresolveGroup(s, sourceNodeId, sourcePort.polymorphicGroupId);
    },
    createId: Workflow.Edge.createId
}

type EdgeReducers = {
    create: (state: Document, conn: Document.DriverConnection) => Workflow.Edge | undefined
    remove: (state: Document, edgeId: Workflow.Edge.Id) => void
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
