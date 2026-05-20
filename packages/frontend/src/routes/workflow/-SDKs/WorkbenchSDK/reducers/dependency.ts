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
            s.data.dependencies = s.data.dependencies ?? {}
            s.data.dependencies[dependency.workflow_id] = dependency
        },
    },
    draft: {
        register: (s, draftDependency) => {
            dependencyReducers.removeUnused(s)
            s.data.draftDependencies = s.data.draftDependencies ?? {}
            s.data.draftDependencies[draftDependency.workflow_id] = draftDependency
        },
    },
    removeUnused: (s) => {
        const usedIds = collectUsedDependencyIds(s)

        if (s.data.dependencies) {
            for (const id of Object.keys(s.data.dependencies) as Workflow.Id[])
                if (!usedIds.has(id)) delete s.data.dependencies[id]
        }
        if (s.data.draftDependencies) {
            for (const id of Object.keys(s.data.draftDependencies) as Workflow.Id[])
                if (!usedIds.has(id)) delete s.data.draftDependencies[id]
        }
    },
} satisfies DependencyReducers

export interface DependencyReducers {
    published: {
        register: (state: WorkbenchSDK.State, dependency: Workflow.Dependency) => void
    }
    draft: {
        register: (state: WorkbenchSDK.State, draftDependency: Workflow.DraftDependency) => void
    }
    removeUnused: (state: WorkbenchSDK.State) => void
}
