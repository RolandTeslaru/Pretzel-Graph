import type { Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDK } from "../sdk"

function collectUsedDependencyIds(s: WorkbenchSDK.State): Set<Workflow.Id> {
    const usedIds = new Set<Workflow.Id>()
    Object.values(s.data.nodes).forEach(node => {
        Object.values(node.fields).forEach(field => {
            if (field.variant === "DependencySelector") {
                const value = s.data.staticValues?.[node.id]?.[field.id]
                if (value) usedIds.add(value as Workflow.Id)
            }
        })
        if (node.workflowDependencyId)
            usedIds.add(node.workflowDependencyId)
    })
    return usedIds
}

export const dependencyReducers = {
    published: {
        register: (s, dependency) => {
            dependencyReducers.removeUnused(s)
            s.data.dependencies.published[dependency.workflow_id] = dependency
        },
    },
    draft: {
        register: (s, draftDependency) => {
            dependencyReducers.removeUnused(s)
            s.data.dependencies.draft[draftDependency.workflow_id] = draftDependency
        },
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
    published: {
        register: (state: WorkbenchSDK.State, dependency: Workflow.Dependency.Publication) => void
    }
    draft: {
        register: (state: WorkbenchSDK.State, draftDependency: Workflow.Dependency.Draft) => void
    }
    removeUnused: (state: WorkbenchSDK.State) => void
}
