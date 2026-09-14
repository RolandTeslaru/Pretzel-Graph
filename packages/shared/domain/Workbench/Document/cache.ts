import { Workflow } from "../../Workflow";
import type { Blueprint } from "../../Foundations/Blueprint";
import type { Field } from "../../Foundations/Field";
import { documentSelectors } from "./selectors";

function resolveFields(
    base: readonly Field[],
    node: Workflow.Node.Raw,
    shapeDepData: Workflow.Data | null,
): readonly Field[] {
    const fields = node.addedFields?.length ? [...base, ...node.addedFields] : [...base];

    // A dependency-backed Execute node is the child workflow's configuration surface. Keep the
    // Execute blueprint fields (scheduler/error controls) and append its global config fields;
    // matching ids belong to the container so they cannot override engine behaviour.
    if (!shapeDepData)
        return fields;

    const byId = new Map(fields.map(field => [field.id, field]));
    for (const field of shapeDepData.globalFields)
        if (!byId.has(field.id))
            byId.set(field.id, field);

    return [...byId.values()];
}

export function resolveShape(data: Workflow.Data, node: Workflow.Node.Raw, blueprint: Blueprint): Workflow.Cache.ResolvedShape {
    const shapeDepData = documentSelectors.node.dependency.getShapeData({ data }, node.id);

    return {
        fields:      resolveFields(blueprint.fields, node, shapeDepData),
        inputs:      Workflow.Node.resolveInputs(blueprint.inputs, node, shapeDepData),
        outputs:     Workflow.Node.resolveOutputs(blueprint.outputs, node, shapeDepData),
        credentials: blueprint.credentials ?? [],
    };
}

export function createCache(data: Workflow.Data, blueprints: Record<Blueprint.Id, Blueprint>): Workflow.Cache {
    const cache = {
        edges: {},
        resolvedShape: {},
        incomingEdgesMap: {},
        outgoingEdgesMap: {},
        inputEdgesByPort: {},
        outputEdgesByPort: {},
    } as Workflow.Cache;

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
        const edge = Workflow.Edge.fromId(edgeId);
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

export function deriveArcs(cache: Workflow.Cache): Workflow.Cache.Arcs {
    const arcMap: Workflow.Cache.Arcs = {}
    for (const [src, targets] of Object.entries(cache.outgoingEdgesMap)) {
        arcMap[src as Workflow.Node.Id] = new Set(Object.keys(targets) as Workflow.Node.Id[])
    }
    return arcMap
}

export function deriveReversedArcs(cache: Workflow.Cache): Workflow.Cache.Arcs {
    const reversedArcMap: Workflow.Cache.Arcs = {}
    for (const [tgt, sources] of Object.entries(cache.incomingEdgesMap)) {
        reversedArcMap[tgt as Workflow.Node.Id] = new Set(Object.keys(sources) as Workflow.Node.Id[])
    }
    return reversedArcMap
}
