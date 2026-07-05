// Migrates a persisted v1 (fat-node) workflow-data blob to the v2 slim-node shape.
//
// v1 nodes carried the full derived shape (fields/inputs/outputs/icon/accent/… + view-state).
// v2 nodes are slim: ids + overrides, with everything else derived from the blueprint on read.
//
// This handles the purely-structural relocations. Two node fields need blueprint/edge context
// and are reconstructed at load instead (see the load action): `reconciledBlueprintId` (needs the
// base blueprint + values) and `polymorphicResolutions` (replayed from edges).

export const WORKFLOW_DATA_VERSION = 2;

export function migrateWorkflowDataToLatest(raw: any): any {
    if (!raw || typeof raw !== "object") return raw;

    // Structural fat-node (v1) -> slim-node (v2). Skip if already slim.
    const data = raw.version === WORKFLOW_DATA_VERSION
        ? { ...raw, nodes: { ...raw.nodes } }
        : migrateV1toV2(raw);

    // Field-level renames, applied condition-by-condition (feature-detected, not version-gated)
    // so they run on both freshly-migrated and already-v2 blobs, and stay idempotent.
    for (const [id, node] of Object.entries<any>(data.nodes ?? {})) {
        if ("dependency" in node) {
            const { dependency, ...rest } = node;
            data.nodes[id] = { ...rest, dependencyRef: dependency };
        }
    }

    // Edges: legacy record<id, {id, source, target}> -> id-only array (endpoints derive from the id).
    if (data.edges && !Array.isArray(data.edges))
        data.edges = Object.keys(data.edges);

    return data;
}

function migrateV1toV2(raw: any): any {
    const nodes: Record<string, any> = {};
    for (const [id, node] of Object.entries<any>(raw.nodes ?? {}))
        nodes[id] = migrateNodeV1toV2(node);

    return { ...raw, nodes, version: WORKFLOW_DATA_VERSION };
}

function migrateNodeV1toV2(n: any): any {
    const slim: any = { id: n.id, blueprintId: n.blueprintId };

    if (n.isDisabled)                slim.isDisabled  = true;
    if (n.dependency)                slim.dependency  = n.dependency;

    // displayName/description + view-state move under `ui`; blueprint-derived icon/accent/iconColor
    // are dropped (we can't tell a genuine override from a copied default without the blueprint,
    // so we trust the blueprint).
    const ui: any = {};
    if (n.displayName !== undefined) ui.displayName = n.displayName;
    if (n.description)               ui.description = n.description;
    if (n.isMinimized)               ui.isMinimized = true;
    if (n.isFlipped)                 ui.isFlipped   = true;
    if (Object.keys(ui).length) slim.ui = ui;

    // User-added ports survive; base ports are derived from the blueprint.
    const addedInputs  = (n.inputs  ?? []).filter((p: any) => p?.isAddedByUser);
    const addedOutputs = (n.outputs ?? []).filter((p: any) => p?.isAddedByUser);
    if (addedInputs.length)  slim.addedInputs  = addedInputs;
    if (addedOutputs.length) slim.addedOutputs = addedOutputs;

    return slim;
}
