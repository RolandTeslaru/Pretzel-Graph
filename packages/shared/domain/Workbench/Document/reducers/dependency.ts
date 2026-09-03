import { Workflow } from "../../../Workflow";
import type { Document } from "../index";
import { isEqual } from "lodash"

const UI_KEYS = ["displayName", "description", "icon", "accent", "iconColor"] as const

// Mode-aware: a workflow can be referenced as a publication and/or a draft, and each mode is a
// separate stored snapshot. Keyed `${mode}:${workflowId}` so removeUnused can't retain the
// opposite-mode copy of a still-referenced workflow.
function collectUsedDependencyKeys(d: Document): Set<string> {
    const used = new Set<string>()
    Object.values(d.data.nodes).forEach(node => {
        if (node.dependencyRef && node.dependencyRef.workflowId)
            used.add(`${node.dependencyRef.mode}:${node.dependencyRef.workflowId}`)
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
            if (field.variant === "UniqueString") continue
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

export const dependencyReducers: DependencyReducers = {
    register: (d, mode, dependency) => {
        d.reducers.dependency.removeUnused(d)
        // Layout/viewport are editor-only; a dependency is executed, not rendered — drop the ui so it
        // doesn't bloat the persisted parent (schema defaults it back if ever re-parsed).
        const { ui: _ui, ...workflow_data } = dependency.workflow_data
        const slim = { ...dependency, workflow_data } as typeof dependency
        if (mode === "publication")
            d.data.dependencies.published[slim.workflow_id] = slim as Workflow.Dependency.Publication
        else
            d.data.dependencies.draft[slim.workflow_id] = slim as Workflow.Dependency.Draft
    },
    attachToNode: (d, nodeId, mode, dependency) => {
        d.reducers.dependency.register(d, mode, dependency)

        d.data.nodes[nodeId].dependencyRef = { workflowId: dependency.workflow_id, mode };
        d.reducers.cache.resolvedShape.recreate(d, nodeId);
        d.isDirty = true
        d.reducers.node.validate(d, nodeId)
    },
    applyUpdate: (d, mode, dependency) => {
        const workflowId = dependency.workflow_id as Workflow.Id

        d.reducers.dependency.register(d, mode, dependency)
        d.isDirty = true

        // Ports / ui / fields all derive from the registered record on read, so there's no node to
        // recreate — just re-validate the nodes that reference it against their new shape.
        for (const node of Object.values(d.data.nodes))
            if (node.dependencyRef?.workflowId === workflowId && node.dependencyRef?.mode === mode) {
                d.reducers.cache.resolvedShape.recreate(d, node.id)
                d.reducers.node.validate(d, node.id)
            }

        if (mode === "publication")
            delete d.dependencyUpdates.published[workflowId]
        else
            delete d.dependencyUpdates.draft[workflowId]
    },
    // Retroactively slim already-persisted (remnant) dependency snapshots. New deps enter slim via
    // `register`, but load bypasses register, so this runs from the load action's normalize pass.
    pruneDefaults: (d) => {
        for (const store of [d.data.dependencies.published, d.data.dependencies.draft])
            for (const dep of Object.values(store))
                pruneWorkflowData(d, dep.workflow_data)
    },
    removeUnused: (d) => {
        const used = collectUsedDependencyKeys(d)

        for (const id of Object.keys(d.data.dependencies.published) as Workflow.Id[])
            if (!used.has(`publication:${id}`)) delete d.data.dependencies.published[id]

        for (const id of Object.keys(d.data.dependencies.draft) as Workflow.Id[])
            if (!used.has(`draft:${id}`)) delete d.data.dependencies.draft[id]
    },
}




export interface DependencyReducers {
    applyUpdate: (
        document:      Document,
        mode:       "publication" | "draft",
        dependency: Workflow.Dependency.Publication | Workflow.Dependency.Draft,
    ) => void
    attachToNode: (
        document:      Document,
        nodeId:     Workflow.Node.Id,
        mode:       "publication" | "draft",
        dependency: Workflow.Dependency.Publication | Workflow.Dependency.Draft,
    ) => void
    register: (
        document:      Document,
        mode:       "publication" | "draft",
        dependency: Workflow.Dependency.Publication | Workflow.Dependency.Draft,
    ) => void
    pruneDefaults: (document: Document) => void
    removeUnused: (document: Document) => void
}
