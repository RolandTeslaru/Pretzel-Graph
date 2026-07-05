import type { Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDK } from "../sdk"

function collectUsedDependencyIds(s: WorkbenchSDK.State): Set<Workflow.Id> {
    const usedIds = new Set<Workflow.Id>()
    Object.values(s.data.nodes).forEach(node => {
        if (node.dependencyRef && node.dependencyRef.workflowId)
            usedIds.add(node.dependencyRef.workflowId)
    })
    return usedIds
}

export const dependencyReducers = {
    register: (s, mode, dependency) => {
        s.reducers.dependency.removeUnused(s)
        if (mode === "publication")
            s.data.dependencies.published[dependency.workflow_id] = dependency as Workflow.Dependency.Publication
        else
            s.data.dependencies.draft[dependency.workflow_id] = dependency as Workflow.Dependency.Draft
    },
    attachToNode: (s, nodeId, workflowId, mode, dependency) => {
        s.reducers.dependency.register(s, mode, dependency)

        s.data.nodes[nodeId].dependencyRef = { workflowId, mode };
        s.isDirty = true
        s.reducers.node.validate(s, nodeId)
    },
    applyUpdate: (s, mode, dependency) => {
        const workflowId = dependency.workflow_id as Workflow.Id

        s.reducers.dependency.register(s, mode, dependency)
        s.isDirty = true

        // Ports / ui / fields all derive from the registered record on read, so there's no node to
        // recreate — just re-validate the nodes that reference it against their new shape.
        for (const node of Object.values(s.data.nodes))
            if (node.dependencyRef?.workflowId === workflowId && node.dependencyRef?.mode === mode)
                s.reducers.node.validate(s, node.id)

        if (mode === "publication")
            delete s.dependencyUpdates.published[workflowId]
        else
            delete s.dependencyUpdates.draft[workflowId]
    },
    removeUnused: (s) => {
        const usedIds = collectUsedDependencyIds(s)

        for (const id of Object.keys(s.data.dependencies.published) as Workflow.Id[])
            if (!usedIds.has(id)) delete s.data.dependencies.published[id]

        for (const id of Object.keys(s.data.dependencies.draft) as Workflow.Id[])
            if (!usedIds.has(id)) delete s.data.dependencies.draft[id]
    },
} satisfies DependencyReducers




export interface DependencyReducers {
    applyUpdate: (
        state:      WorkbenchSDK.State,
        mode:       "publication" | "draft",
        dependency: Workflow.Dependency.Publication | Workflow.Dependency.Draft,
    ) => void
    attachToNode: (
        state:      WorkbenchSDK.State,
        nodeId:     Workflow.Node.Id,
        workflowId: Workflow.Id,
        mode:       "publication" | "draft",
        dependency: Workflow.Dependency.Publication | Workflow.Dependency.Draft,
    ) => void
    register: (
        state:      WorkbenchSDK.State,
        mode:       "publication" | "draft",
        dependency: Workflow.Dependency.Publication | Workflow.Dependency.Draft,
    ) => void
    removeUnused: (state: WorkbenchSDK.State) => void
}
