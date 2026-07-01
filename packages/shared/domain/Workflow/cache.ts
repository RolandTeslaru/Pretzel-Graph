import { Port } from "../Foundations/Port";
import { Data } from "./data";
import { NodeId, EdgeId } from "./ids";

export interface Cache {
    // nodes coming
    incomingEdgesMap: Record<
        NodeId,     // the node where the edges are coming in
        Record<
            NodeId,     // the source node id
            EdgeId      // the edge id
        >
    >,
    outgoingEdgesMap: Record<
        NodeId,     // (source node id) the node where the edges are going out from
        Record<
            NodeId, // (target node id) 
            EdgeId
        >
    >,
    inputHandlesMap: Record<
        NodeId,
        Record<
            Port.Input.Id,
            EdgeId
        >
    >,
    outputHandlesMap: Record<
        NodeId,
        Record<
            Port.Output.Id,
            EdgeId
        >
    >
}

export namespace Cache {
    export const INITIAL = {
        incomingEdgesMap: {},
        outgoingEdgesMap: {},
        inputHandlesMap: {},
        outputHandlesMap: {},
    }
}

export function createCache(data: Data): Cache {
    const cache = {
        incomingEdgesMap: {},
        outgoingEdgesMap: {},
        inputHandlesMap: {},
        outputHandlesMap: {},
    } as Cache;

    Object.values(data.nodes).forEach(node => {
        cache.outgoingEdgesMap[node.id] = {};
        cache.incomingEdgesMap[node.id] = {};
        cache.inputHandlesMap[node.id] = {};
        cache.outputHandlesMap[node.id] = {};
    })

    Object.values(data.edges).forEach(edge => {
        const sourceNodeId = edge.source.nodeId;
        const targetNodeId = edge.target.nodeId;

        const sourceHandleId = edge.source.portId;
        const targetHandleId = edge.target.portId

        // Skip dangling edges whose endpoints were removed but the edge lingered —
        // otherwise indexing into a missing node's bucket throws and the whole load fails.
        if (!cache.outgoingEdgesMap[sourceNodeId] || !cache.incomingEdgesMap[targetNodeId]) {
            console.error(`[createCache] Skipping dangling edge ${edge.id}: missing ${!cache.outgoingEdgesMap[sourceNodeId] ? `source node "${sourceNodeId}"` : `target node "${targetNodeId}"`}`);
            return;
        }

        // Outgoers Edges Map
        cache.outgoingEdgesMap[sourceNodeId][targetNodeId] = edge.id

        // Ingoers Edges Map
        cache.incomingEdgesMap[targetNodeId][sourceNodeId] = edge.id

        cache.inputHandlesMap[targetNodeId][targetHandleId] = edge.id

        cache.outputHandlesMap[sourceNodeId][sourceHandleId] = edge.id

    })

    return cache
}

export function deriveArcs(cache: Cache) {
    const arcMap: Record<NodeId, Set<NodeId>> = {}
    for (const [src, targets] of Object.entries(cache.outgoingEdgesMap)) {
        arcMap[src as NodeId] = new Set(Object.keys(targets) as NodeId[])
    }
    return arcMap
}

export function deriveReversedArcs(cache: Cache) {
    const reversedArcMap: Record<NodeId, Set<NodeId>> = {}
    for (const [tgt, sources] of Object.entries(cache.incomingEdgesMap)) {
        reversedArcMap[tgt as NodeId] = new Set(Object.keys(sources) as NodeId[])
    }
    return reversedArcMap
}