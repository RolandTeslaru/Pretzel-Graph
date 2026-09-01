import type { Dependency } from "./dependency";
import { resolveInputs, resolveOutputs } from "./resolvers";
import type { Blueprint } from "../Foundations/Blueprint";
import { Port } from "../Foundations/Port";
import type { Field } from "../Foundations/Field";
import type { Vault } from "../Vault";
import { Data } from "./data";
import { Edge } from "./edge";
import { NodeId, EdgeId } from "./ids";
import type { Node } from "./node";

export interface Cache {

    resolvedShape: Record<NodeId, Cache.ResolvedShape>,

    // Expanded edges, rebuilt from the id-only `data.edges` on every cache build. This is the
    // derived source for the fat `{id, source, target}` shape; `data.edges` stays id-only.
    edges: Record<EdgeId, Edge>,
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
    inputEdgesByPort: Record<
        NodeId,
        Record<
            Port.Input.Id,
            EdgeId
        >
    >,
    outputEdgesByPort: Record<
        NodeId,
        Record<
            Port.Output.Id,
            EdgeId
        >
    >
}

export namespace Cache {
    export interface ResolvedShape {
        fields:      readonly Field[]
        inputs:      Port.Input[]
        outputs:     Port.Output[]
        credentials: readonly Vault.Credential.Template[]
    }

    export const INITIAL = {
        edges: {},
        resolvedShape: {},
        incomingEdgesMap: {},
        outgoingEdgesMap: {},
        inputEdgesByPort: {},
        outputEdgesByPort: {},
    }
}

function getNodeDependency(data: Data, node: Node.Raw): Dependency | null {
    const ref = node.dependencyRef;
    if (!ref) return null;
    const store = ref.mode === "publication" ? data.dependencies.published : data.dependencies.draft;
    return store[ref.workflowId] ?? null;
}

function resolveFields(
    base: readonly Field[],
    node: Node.Raw,
    dependency: Dependency | null,
): readonly Field[] {
    const fields = node.addedFields?.length ? [...base, ...node.addedFields] : [...base];

    // A dependency-backed Execute node is the child workflow's configuration surface. Keep the
    // Execute blueprint fields (scheduler/error controls) and append its global config fields;
    // matching ids belong to the container so they cannot override engine behaviour.
    if (!dependency)
        return fields;

    const byId = new Map(fields.map(field => [field.id, field]));
    for (const field of dependency.workflow_data.fields)
        if (!byId.has(field.id))
            byId.set(field.id, field);

    return [...byId.values()];
}

export function resolveShape(data: Data, node: Node.Raw, blueprint: Blueprint): Cache.ResolvedShape {
    const dependency = getNodeDependency(data, node);

    return {
        fields: resolveFields(blueprint.fields, node, dependency),
        inputs: resolveInputs(blueprint.inputs, node, dependency),
        outputs: resolveOutputs(blueprint.outputs, node, dependency),
        credentials: blueprint.credentials ?? [],
    };
}

export function createCache(data: Data, blueprints: Record<Blueprint.Id, Blueprint>): Cache {
    const cache = {
        edges: {},
        resolvedShape: {},
        incomingEdgesMap: {},
        outgoingEdgesMap: {},
        inputEdgesByPort: {},
        outputEdgesByPort: {},
    } as Cache;

    Object.values(data.nodes).forEach(node => {
        
        cache.outgoingEdgesMap[node.id] = {};
        cache.incomingEdgesMap[node.id] = {};
        cache.inputEdgesByPort[node.id] = {};
        cache.outputEdgesByPort[node.id] = {};

        if (blueprints) {
            const blueprint = blueprints[node.reconciledBlueprintId ?? node.blueprintId];
            if(!blueprint)
                throw new Error(`Cannot create cache for node ${node.id}: blueprint ${node.reconciledBlueprintId ?? node.blueprintId} not found.`)

            cache.resolvedShape[node.id] = resolveShape(data, node, blueprint);
        }
    })

    // data.edges is id-only; expand each into its fat form here (the single split point).
    data.edges.forEach(edgeId => {
        const edge = Edge.fromId(edgeId);
        const sourceNodeId = edge.source.nodeId;
        const targetNodeId = edge.target.nodeId;

        const sourceHandleId = edge.source.portId;
        const targetHandleId = edge.target.portId

        // Skip dangling edges whose endpoints were removed but the edge lingered —
        // otherwise indexing into a missing node's bucket throws and the whole load fails.
        if (!cache.outgoingEdgesMap[sourceNodeId] || !cache.incomingEdgesMap[targetNodeId]) {
            console.error(`[createCache] Skipping dangling edge ${edgeId}: missing ${!cache.outgoingEdgesMap[sourceNodeId] ? `source node "${sourceNodeId}"` : `target node "${targetNodeId}"`}`);
            return;
        }

        cache.edges[edgeId] = edge;

        // Outgoers Edges Map
        cache.outgoingEdgesMap[sourceNodeId][targetNodeId] = edgeId

        // Ingoers Edges Map
        cache.incomingEdgesMap[targetNodeId][sourceNodeId] = edgeId

        cache.inputEdgesByPort[targetNodeId][targetHandleId] = edgeId

        cache.outputEdgesByPort[sourceNodeId][sourceHandleId] = edgeId

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
