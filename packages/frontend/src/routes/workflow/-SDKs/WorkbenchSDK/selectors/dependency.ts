import type { Workflow } from '@pretzel-graph/shared/domain';
import type { WorkbenchSDK } from '../sdk';

export interface DependencySelectors {
    doesNodeHaveUpdate: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    published: {
        getUpdateInfo: (state: WorkbenchSDK.State, workflowDependencyId: Workflow.Id) => Workflow.Dependency.Publication.UpdateInfo | null
    }
    draft: {
        getUpdateInfo: (state: WorkbenchSDK.State, workflowDependencyId: Workflow.Id) => Workflow.Dependency.Draft.UpdateInfo | null
    }
}

export const dependencySelectors = {
    doesNodeHaveUpdate: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node?.workflowDependencyId) return false;
        return node.workflowDependencyId in s.dependencyUpdates.published ||
               node.workflowDependencyId in s.dependencyUpdates.draft;
    },
    published: {
        getUpdateInfo: (s, workflowDependencyId) => s.dependencyUpdates.published[workflowDependencyId] ?? null,
    },
    draft: {
        getUpdateInfo: (s, workflowDependencyId) => s.dependencyUpdates.draft[workflowDependencyId] ?? null,
    },
} satisfies DependencySelectors
