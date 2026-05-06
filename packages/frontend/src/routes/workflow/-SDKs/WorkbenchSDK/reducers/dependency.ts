import type { Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDK } from "../sdk"

export const dependencyReducers = {
    registerDependency: (s, dependency) => {
        s.data.dependencies = s.data.dependencies ?? {}
        s.data.dependencies[dependency.workflow_id] = dependency
    },
    removeUnused: (s) => {
        if (!s.data.dependencies) return
        const usedDependencyIds = new Set<Workflow.Id>()

        Object.values(s.data.nodes).forEach(node => {
            Object.values(node.fields).forEach(field => {
                if (field.variant === "DependencySelector"){
                    const value = s.data.staticValues?.[node.id]?.[field.id]
                    if(value)
                        usedDependencyIds.add(value as Workflow.Id)
                }
            })
        })

        Object.keys(s.data.dependencies).forEach(_depId => {
            const dependencyId = _depId as Workflow.Id
            if (!usedDependencyIds.has(dependencyId))
                delete s.data.dependencies?.[dependencyId]
        })
    }
} satisfies DependencyReducers

export interface DependencyReducers {
    registerDependency: (state: WorkbenchSDK.State, dependency: Workflow.Dependency) => void
    removeUnused: (state: WorkbenchSDK.State) => void
}
