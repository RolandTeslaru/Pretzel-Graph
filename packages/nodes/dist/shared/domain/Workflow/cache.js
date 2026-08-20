"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
exports.resolveShape = resolveShape;
exports.createCache = createCache;
exports.deriveArcs = deriveArcs;
exports.deriveReversedArcs = deriveReversedArcs;
const resolvers_1 = require("./resolvers");
const edge_1 = require("./edge");
var Cache;
(function (Cache) {
    Cache.INITIAL = {
        edges: {},
        resolvedShape: {},
        incomingEdgesMap: {},
        outgoingEdgesMap: {},
        inputHandlesMap: {},
        outputHandlesMap: {},
    };
})(Cache || (exports.Cache = Cache = {}));
function getNodeDependency(data, node) {
    const ref = node.dependencyRef;
    if (!ref)
        return null;
    const store = ref.mode === "publication" ? data.dependencies.published : data.dependencies.draft;
    return store[ref.workflowId] ?? null;
}
function resolveFields(base, node, dependency) {
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
function resolveShape(data, node, blueprint) {
    const dependency = getNodeDependency(data, node);
    return {
        fields: resolveFields(blueprint.fields, node, dependency),
        inputs: (0, resolvers_1.resolveInputs)(blueprint.inputs, node, dependency),
        outputs: (0, resolvers_1.resolveOutputs)(blueprint.outputs, node, dependency),
        credentials: blueprint.credentials ?? [],
    };
}
function createCache(data, blueprints) {
    const cache = {
        edges: {},
        resolvedShape: {},
        incomingEdgesMap: {},
        outgoingEdgesMap: {},
        inputHandlesMap: {},
        outputHandlesMap: {},
    };
    Object.values(data.nodes).forEach(node => {
        cache.outgoingEdgesMap[node.id] = {};
        cache.incomingEdgesMap[node.id] = {};
        cache.inputHandlesMap[node.id] = {};
        cache.outputHandlesMap[node.id] = {};
        if (blueprints) {
            const blueprint = blueprints[node.reconciledBlueprintId ?? node.blueprintId];
            if (!blueprint)
                throw new Error(`Cannot create cache for node ${node.id}: blueprint ${node.reconciledBlueprintId ?? node.blueprintId} not found.`);
            cache.resolvedShape[node.id] = resolveShape(data, node, blueprint);
        }
    });
    // data.edges is id-only; expand each into its fat form here (the single split point).
    data.edges.forEach(edgeId => {
        const edge = edge_1.Edge.fromId(edgeId);
        const sourceNodeId = edge.source.nodeId;
        const targetNodeId = edge.target.nodeId;
        const sourceHandleId = edge.source.portId;
        const targetHandleId = edge.target.portId;
        // Skip dangling edges whose endpoints were removed but the edge lingered —
        // otherwise indexing into a missing node's bucket throws and the whole load fails.
        if (!cache.outgoingEdgesMap[sourceNodeId] || !cache.incomingEdgesMap[targetNodeId]) {
            console.error(`[createCache] Skipping dangling edge ${edgeId}: missing ${!cache.outgoingEdgesMap[sourceNodeId] ? `source node "${sourceNodeId}"` : `target node "${targetNodeId}"`}`);
            return;
        }
        cache.edges[edgeId] = edge;
        // Outgoers Edges Map
        cache.outgoingEdgesMap[sourceNodeId][targetNodeId] = edgeId;
        // Ingoers Edges Map
        cache.incomingEdgesMap[targetNodeId][sourceNodeId] = edgeId;
        cache.inputHandlesMap[targetNodeId][targetHandleId] = edgeId;
        cache.outputHandlesMap[sourceNodeId][sourceHandleId] = edgeId;
    });
    return cache;
}
function deriveArcs(cache) {
    const arcMap = {};
    for (const [src, targets] of Object.entries(cache.outgoingEdgesMap)) {
        arcMap[src] = new Set(Object.keys(targets));
    }
    return arcMap;
}
function deriveReversedArcs(cache) {
    const reversedArcMap = {};
    for (const [tgt, sources] of Object.entries(cache.incomingEdgesMap)) {
        reversedArcMap[tgt] = new Set(Object.keys(sources));
    }
    return reversedArcMap;
}
