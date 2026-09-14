import { Dependency } from "../../../Dependency";
import { Workflow } from "../../../Workflow";
import type { Document } from "../index";

// Every dependency the nodes' fields point at.
function collectUsedIds(d: Document): Set<Dependency.Id> {
    const used = new Set<Dependency.Id>()
    Object.values(d.data.nodes).forEach(node => {
        for (const ref of d.selectors.node.dependency.getRefs(d, node.id))
            used.add(Dependency.createId(ref))
    })
    return used
}

// Layout/viewport are editor-only; a dependency is executed, not rendered, so its snapshot drops the ui.
function withoutUi(data: Workflow.Data): Workflow.Data {
    const { ui: _ui, ...rest } = data
    return rest as Workflow.Data
}

export const dependencyReducers: DependencyReducers = {
    register: (d, ref, value) => {
        d.reducers.dependency.removeUnused(d)

        const id = Dependency.createId(ref)

        switch (value.kind) {
            case "draftWorkflow":
            case "publishedWorkflow":
            case "listing":
                d.data.dependencies[id] = { ...value, workflow_data: withoutUi(value.workflow_data) }
                break

            default:
                value satisfies never
        }
    },
    applyUpdate: (d, ref, value) => {
        const id = Dependency.createId(ref)

        d.reducers.dependency.register(d, ref, value)
        d.isDirty = true

        // Ports / ui / fields all derive from the registered record on read, so there's no node to
        // recreate — just re-validate the nodes that reference it against their new shape.
        for (const node of Object.values(d.data.nodes)) {
            const shapeDepRef = d.selectors.node.dependency.getShapeRef(d, node.id)

            if (shapeDepRef && Dependency.createId(shapeDepRef) === id) {
                d.reducers.cache.resolvedShape.recreate(d, node.id)
                d.reducers.node.validate(d, node.id)
            }
        }

        if (ref.kind === "draftWorkflow")
            delete d.dependencyUpdates.draftWorkflow[ref.id]
        else
            delete d.dependencyUpdates.publishedWorkflow[ref.id]
    },
    removeUnused: (d) => {
        const used = collectUsedIds(d)

        for (const id of Object.keys(d.data.dependencies) as Dependency.Id[])
            if (!used.has(id))
                delete d.data.dependencies[id]
    },
}




export interface DependencyReducers {
    applyUpdate: (
        document: Document,
        ref:      Dependency.Ref,
        value:    Dependency.Value,
    ) => void
    register: (
        document: Document,
        ref:      Dependency.Ref,
        value:    Dependency.Value,
    ) => void
    removeUnused: (document: Document) => void
}
