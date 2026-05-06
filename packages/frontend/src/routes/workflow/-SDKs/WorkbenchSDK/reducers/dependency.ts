import type { Workflow, Foundations, VersionControl } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDK } from "../sdk"

export const dependencyReducers = {
    registerDependency: (s, publication) => {
        s.data.dependencies = s.data.dependencies ?? {}
        s.data.dependencies[publication.workflow_id] = publication
    }
} satisfies DependencyReducers

export interface DependencyReducers {
    registerDependency: (state: WorkbenchSDK.State, publication: VersionControl.Publication) => void
}