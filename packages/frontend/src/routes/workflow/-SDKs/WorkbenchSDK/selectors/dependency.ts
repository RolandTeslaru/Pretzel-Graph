import type { Workflow } from '@pretzel-graph/shared/domain';
import type { WorkbenchSDK } from '../sdk';

export interface DependencySelectors {
    doesNodeHaveUpdate: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    getUpdateInfo: (state: WorkbenchSDK.State, workflowDependencyId: Workflow.Id) => Workflow.Dependency.UpdateInfo | null
}

export const dependencySelectors = {
    doesNodeHaveUpdate: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node?.workflowDependencyId) return false;
        return node.workflowDependencyId in s.dependencyUpdates;
    },
    getUpdateInfo: (s, workflowDependencyId) => {
        return s.dependencyUpdates[workflowDependencyId] ?? null;
    },
} satisfies DependencySelectors
