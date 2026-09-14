import type { Dependency } from "../../../Dependency";
import { Workflow } from "../../../Workflow";
import type { Document } from "../index";
import { isEqual } from "lodash"

const UI_KEYS = ["displayName", "description", "icon", "accent", "iconColor"] as const

// Listings share the published store until they get their own.
function storeKey(kind: Dependency.Ref.Workflow["kind"], workflowId: Workflow.Id): string {
    const store = kind === "draft" ? "draft" : "publication"
    return `${store}:${workflowId}`
}

// Store-aware: a workflow can be referenced as a publication and/or a draft, and each is a separate
// stored snapshot, so keys carry the store and removeUnused can't retain the other copy.
function collectUsedDependencyKeys(d: Document): Set<string> {
    const used = new Set<string>()
    Object.values(d.data.nodes).forEach(node => {
        for (const ref of d.selectors.node.getWorkflowDependencyRefs(d, node.id))
            if (ref.id)
                used.add(storeKey(ref.kind, ref.id))
    })
    return used
}

// Slim one embedded dependency snapshot in place: always drop the editor-only layout/viewport
// (never needed for an executed dependency), and — where the node's blueprint is hydrated —
// prune ui overrides / staticValues that equal blueprint defaults (derived on read). Dep-node
// blueprints aren't guaranteed loaded, so node-level pruning safely skips when absent.
function pruneWorkflowData(d: Document, data: Workflow.Data) {
    if ("ui" in data) {
        // Only a fat (remnant) layout is a real change; a schema-defaulted empty ui isn't.
        const hadLayout = Object.keys(data.ui?.layout ?? {}).length > 0
        delete (data as { ui?: unknown }).ui
        if (hadLayout) d.isDirty = true
    }

    for (const node of Object.values(data.nodes)) {
        const blueprint = d.selectors.blueprint.ofNode(d, node)
        if (!blueprint) continue

        if (node.ui)
            for (const key of UI_KEYS)
                if (node.ui[key] !== undefined && node.ui[key] === blueprint.ui[key]) {
                    delete node.ui[key]
                    d.isDirty = true
                }

        const bucket = data.staticValues[node.id]
        if (!bucket) continue

        const initialById = new Map<string, unknown>()
        const fields = node.addedFields?.length ? [...blueprint.fields, ...node.addedFields] : blueprint.fields
        for (const field of fields) {
            if (field.variant === "UniqueString" || field.variant === "WorkflowDependency") continue
            if ("initialValue" in field) initialById.set(field.id, field.initialValue)
        }
        for (const input of Workflow.Node.resolveInputs(blueprint.inputs, node, null))
            if ("initialValue" in input && input.initialValue !== undefined)
                initialById.set(input.id, input.initialValue)

        for (const key of Object.keys(bucket))
            // @ts-expect-error - TS doesn't know the bucket is a Record<string, unknown>
            if (initialById.has(key) && isEqual(bucket[key], initialById.get(key))) {
                // @ts-expect-error
                delete bucket[key]
                d.isDirty = true
            }
        if (Object.keys(bucket).length === 0)
            delete data.staticValues[node.id]
    }
}

// Layout/viewport are editor-only; a dependency is executed, not rendered, so its snapshot drops the ui.
function withoutUi(data: Workflow.Data): Workflow.Data {
    const { ui: _ui, ...rest } = data
    return rest as Workflow.Data
}

export const dependencyReducers: DependencyReducers = {
    register: (d, kind, dependency) => {
        d.reducers.dependency.removeUnused(d)

        if (kind === "draft") {
            const draft = dependency as Dependency.Value.Draft
            d.data.dependencies.draftWorkflows[draft.id] = { ...draft, data: withoutUi(draft.data) }
        }
        else {
            const publication = dependency as Dependency.Value.Publication
            d.data.dependencies.publishedWorkflows[publication.workflow_id] = { ...publication, workflow_data: withoutUi(publication.workflow_data) }
        }
    },
    applyUpdate: (d, kind, dependency) => {
        const workflowId = kind === "draft"
            ? (dependency as Dependency.Value.Draft).id
            : (dependency as Dependency.Value.Publication).workflow_id

        d.reducers.dependency.register(d, kind, dependency)
        d.isDirty = true

        // Ports / ui / fields all derive from the registered record on read, so there's no node to
        // recreate — just re-validate the nodes that reference it against their new shape.
        for (const node of Object.values(d.data.nodes)) {
            const shapeDepRef = d.selectors.node.getShapeDependencyRef(d, node.id)

            if (shapeDepRef && storeKey(shapeDepRef.kind, shapeDepRef.id) === storeKey(kind, workflowId)) {
                d.reducers.cache.resolvedShape.recreate(d, node.id)
                d.reducers.node.validate(d, node.id)
            }
        }

        if (kind === "draft")
            delete d.dependencyUpdates.draftWorkflows[workflowId]
        else
            delete d.dependencyUpdates.publishedWorkflows[workflowId]
    },
    // Retroactively slim already-persisted (remnant) dependency snapshots. New deps enter slim via
    // `register`, but load bypasses register, so this runs from the load action's normalize pass.
    pruneDefaults: (d) => {
        for (const dep of Object.values(d.data.dependencies.publishedWorkflows))
            pruneWorkflowData(d, dep.workflow_data)

        for (const dep of Object.values(d.data.dependencies.draftWorkflows))
            pruneWorkflowData(d, dep.data)
    },
    removeUnused: (d) => {
        const used = collectUsedDependencyKeys(d)

        for (const id of Object.keys(d.data.dependencies.publishedWorkflows) as Workflow.Id[])
            if (!used.has(storeKey("publication", id))) delete d.data.dependencies.publishedWorkflows[id]

        for (const id of Object.keys(d.data.dependencies.draftWorkflows) as Workflow.Id[])
            if (!used.has(storeKey("draft", id))) delete d.data.dependencies.draftWorkflows[id]
    },
}




export interface DependencyReducers {
    applyUpdate: (
        document:   Document,
        kind:       Dependency.Ref.Workflow["kind"],
        dependency: Dependency.Value.Publication | Dependency.Value.Draft,
    ) => void
    register: (
        document:   Document,
        kind:       Dependency.Ref.Workflow["kind"],
        dependency: Dependency.Value.Publication | Dependency.Value.Draft,
    ) => void
    pruneDefaults: (document: Document) => void
    removeUnused: (document: Document) => void
}
