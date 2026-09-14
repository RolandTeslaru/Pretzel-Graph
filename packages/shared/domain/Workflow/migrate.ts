// Migrates a persisted v1 (fat-node) workflow-data blob to the v2 slim-node shape.
//
// v1 nodes carried the full derived shape (fields/inputs/outputs/icon/accent/… + view-state).
// v2 nodes are slim: ids + overrides, with everything else derived from the blueprint on read.
//
// This handles the purely-structural relocations. Two node fields need blueprint/edge context
// and are reconstructed at load instead (see the load action): `reconciledBlueprintId` (needs the
// base blueprint + values) and `polymorphicResolutions` (replayed from edges).

import { SHAPE_DEPENDENCY_FIELD_ID, isListingId } from "./ids";

export const WORKFLOW_DATA_VERSION = 6;

export function migrateWorkflowDataToLatest(raw: any): any {
    if (!raw || typeof raw !== "object") return raw;

    const from = typeof raw.version === "number" ? raw.version : 1;

    // Structural fat-node (v1) -> slim-node (v2). Skip if already slim.
    const data = from >= 2
        ? { ...raw, nodes: { ...raw.nodes } }
        : migrateV1toV2(raw);

    // Field-level renames, applied condition-by-condition (feature-detected, not version-gated)
    // so they run on both freshly-migrated and already-v2 blobs, and stay idempotent.
    for (const [id, node] of Object.entries<any>(data.nodes ?? {})) {
        const dependencyRef = node.dependencyRef ?? node.dependency;
        if (!dependencyRef)
            continue;

        const rest = { ...node };
        delete rest.dependency;
        delete rest.dependencyRef;
        data.nodes[id] = rest;

        // v5: a listing pointer has its own mode.
        const shapeDepRef = { ...dependencyRef };
        if (typeof shapeDepRef.workflowId === "string" && isListingId(shapeDepRef.workflowId))
            shapeDepRef.mode = "listing";

        // v5: a sub-workflow node's pointer is a reserved static value, not a node property.
        data.staticValues = { ...data.staticValues };
        data.staticValues[id] = { ...data.staticValues[id], [SHAPE_DEPENDENCY_FIELD_ID]: shapeDepRef };
    }

    // Edges: legacy record<id, {id, source, target}> -> id-only array (endpoints derive from the id).
    if (data.edges && !Array.isArray(data.edges))
        data.edges = Object.keys(data.edges);

    liftAddedFieldExpressions(data);
    renameGlobalFields(data);
    foldDependencyStores(data);
    reshapeRefs(data);

    if (from < 4)
        foldVariadicSlots(data);

    data.version = WORKFLOW_DATA_VERSION;

    return data;
}

// v3: workflow-level fields are `globalFields`, and the reserved staticValues key that carries
// their values follows. Feature-detected so it is idempotent on already-renamed blobs.
function renameGlobalFields(data: any): void {
    if ("fields" in data && !("globalFields" in data)) {
        const { fields, ...rest } = data;
        Object.assign(data, rest);
        delete data.fields;
        data.globalFields = fields;
    }

    const legacyKey = "__workflow_config__";

    if (data.staticValues && legacyKey in data.staticValues) {
        data.staticValues = { ...data.staticValues };
        data.staticValues["__workflow_global_fields__"] ??= data.staticValues[legacyKey];
        delete data.staticValues[legacyKey];
    }
}

// Every earlier per-kind store name, by the kind of snapshot it held.
const LEGACY_DEPENDENCY_STORES: Record<string, string> = {
    draft:              "draftWorkflow",
    draftWorkflows:     "draftWorkflow",
    draftWorkflow:      "draftWorkflow",
    published:          "publishedWorkflow",
    publishedWorkflows: "publishedWorkflow",
    publishedWorkflow:  "publishedWorkflow",
    listing:            "listing",
};

// v6: snapshots live in one store keyed by `kind:id` and carry their kind; the per-kind stores are folded in. Feature-detected so it is idempotent.
function foldDependencyStores(data: any): void {
    const dependencies = data.dependencies && typeof data.dependencies === "object" ? data.dependencies : {};
    const store: Record<string, any> = {};

    for (const [key, entry] of Object.entries<any>(dependencies)) {
        const legacyKind = LEGACY_DEPENDENCY_STORES[key];

        if (!legacyKind) {
            store[key] = reshapeSnapshot(entry?.kind ?? key.split(":")[0], entry);
            continue;
        }

        for (const [id, snapshot] of Object.entries<any>(entry ?? {})) {
            const kind = legacyKind === "publishedWorkflow" && isListingId(id) ? "listing" : legacyKind;

            store[`${kind}:${id}`] = reshapeSnapshot(kind, snapshot);
        }
    }

    data.dependencies = store;
}

// v5: a draft snapshot uses the workflow row's field names; v6: every workflow snapshot keeps its graph in `workflow_data`. Idempotent.
function reshapeSnapshot(kind: string, snapshot: any): any {
    if (!snapshot || typeof snapshot !== "object")
        return snapshot;

    if (kind === "draftWorkflow" && "workflow_updated_at" in snapshot)
        return {
            kind,
            id:            snapshot.workflow_id,
            display_name:  snapshot.display_name,
            icon:          snapshot.icon,
            accent:        snapshot.accent,
            updated_at:    snapshot.workflow_updated_at,
            workflow_data: snapshot.workflow_data,
        };

    const { publication_name, data, ...rest } = snapshot;

    return {
        ...rest,
        kind,
        ...(publication_name !== undefined ? { name: publication_name } : {}),
        ...(data !== undefined ? { workflow_data: data } : {}),
    };
}

// Every earlier ref kind, by its current name.
const REF_KINDS = new Map([
    ["draft",       "draftWorkflow"],
    ["publication", "publishedWorkflow"],
    ["listing",     "listing"],
]);

// v6: a dependency ref is `{ kind, id }`, its kind named after its store; feature-detected so it is idempotent.
function reshapeRefs(data: any): void {
    if (!data.staticValues || typeof data.staticValues !== "object")
        return;

    const staticValues = { ...data.staticValues };

    for (const [nodeId, bucket] of Object.entries<any>(staticValues)) {
        if (!bucket || typeof bucket !== "object")
            continue;

        for (const [fieldId, value] of Object.entries<any>(bucket)) {
            const ref = upgradeRef(value);

            if (ref)
                staticValues[nodeId] = { ...staticValues[nodeId], [fieldId]: ref };
        }
    }

    data.staticValues = staticValues;
}

// An earlier ref (`{ mode | kind, workflowId | id }`) as `{ kind, id }`; null for any other value.
function upgradeRef(value: any): { kind: string, id: string } | null {
    if (!value || typeof value !== "object" || Object.keys(value).length !== 2)
        return null;

    const kind = REF_KINDS.get(value.kind ?? value.mode);
    const id   = value.id ?? value.workflowId;

    if (!kind || typeof id !== "string")
        return null;

    return { kind, id };
}

// `isExpression` used to live on the Field itself. On a user-added field that made it persisted
// per-node state, which is exactly what `fieldExpressions` now holds — so lift it across and drop
// the key. (On blueprint fields the flag was never persisted at all; nothing to migrate there.)
function liftAddedFieldExpressions(data: any): void {
    for (const [nodeId, node] of Object.entries<any>(data.nodes ?? {})) {
        if (!Array.isArray(node?.addedFields)) continue;

        node.addedFields = node.addedFields.map((field: any) => {
            if (!field || !("isExpression" in field)) return field;

            const { isExpression, ...rest } = field;

            if (isExpression === true) {
                data.fieldExpressions ??= {};
                data.fieldExpressions[nodeId] ??= {};
                data.fieldExpressions[nodeId][field.id] = true;
            }

            return rest;
        });
    }
}

// v4: a variadic group is a slot count on its field, derived into ports on read, instead of
// extra ports stored on the node. Base slot counts are what each blueprint used to declare.
const LEGACY_VARIADIC: Record<string, { groupId: string; fieldId: string; base: number }> = {
    "Core.Routing.Merge":       { groupId: "variadic_inputs_1", fieldId: "inputPorts", base: 2 },
    "Core.Routing.Passthrough": { groupId: "passthrough",       fieldId: "ports",      base: 1 },
    "Core.Utils.Tool.Catalog":  { groupId: "tools_group",       fieldId: "tools_num",  base: 1 },
};

function foldVariadicSlots(data: any): void {
    for (const node of Object.values<any>(data.nodes ?? {})) {
        const legacy = LEGACY_VARIADIC[node?.blueprintId];
        if (!legacy)
            continue;

        const isSlot = (port: any) => port?.groupId === legacy.groupId;

        const addedInputs  = (node.addedInputs  ?? []).filter(isSlot).length;
        const addedOutputs = (node.addedOutputs ?? []).filter(isSlot).length;
        const count        = legacy.base + Math.max(addedInputs, addedOutputs);

        data.staticValues ??= {};
        data.staticValues[node.id] = { ...(data.staticValues[node.id] ?? {}), [legacy.fieldId]: count };

        const keptInputs  = (node.addedInputs  ?? []).filter((p: any) => !isSlot(p));
        const keptOutputs = (node.addedOutputs ?? []).filter((p: any) => !isSlot(p));

        if (keptInputs.length)  node.addedInputs  = keptInputs;  else delete node.addedInputs;
        if (keptOutputs.length) node.addedOutputs = keptOutputs; else delete node.addedOutputs;

        node.reconciledBlueprintId = `${node.blueprintId}:${legacy.fieldId}==${count}`;
    }
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
