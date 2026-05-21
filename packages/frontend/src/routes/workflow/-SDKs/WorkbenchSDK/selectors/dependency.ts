import type { Workflow } from '@pretzel-graph/shared/domain';
import type { WorkbenchSDK } from '../sdk';

export interface DependencySelectors {
    doesNodeHaveUpdate: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => boolean
    published: {
        get:           (state: WorkbenchSDK.State, workflowId: Workflow.Id) => Workflow.Dependency.Publication | null
        getUpdateInfo: (state: WorkbenchSDK.State, workflowId: Workflow.Id) => Workflow.Dependency.Publication.UpdateInfo | null
    }
    draft: {
        get:           (state: WorkbenchSDK.State, workflowId: Workflow.Id) => Workflow.Dependency.Draft | null
        getUpdateInfo: (state: WorkbenchSDK.State, workflowId: Workflow.Id) => Workflow.Dependency.Draft.UpdateInfo | null
    }
}

export const dependencySelectors = {
    doesNodeHaveUpdate: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node?.dependency) 
            return false;
        
        const { workflowId, mode } = node.dependency;
        if(!workflowId) 
            return false
        if (mode === "publication") 
            return workflowId in s.dependencyUpdates.published;
        return workflowId in s.dependencyUpdates.draft;
    },
    published: {
        get:           (s, workflowId) => s.data.dependencies.published[workflowId] ?? null,
        getUpdateInfo: (s, workflowId) => s.dependencyUpdates.published[workflowId] ?? null,
    },
    draft: {
        get:           (s, workflowId) => s.data.dependencies.draft[workflowId] ?? null,
        getUpdateInfo: (s, workflowId) => s.dependencyUpdates.draft[workflowId] ?? null,
    },
} satisfies DependencySelectors
