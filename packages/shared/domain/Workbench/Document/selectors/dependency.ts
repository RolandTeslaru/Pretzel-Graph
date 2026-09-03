import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface DependencySelectors {
    doesNodeHaveUpdate: (state: Document, nodeId: Workflow.Node.Id) => boolean
    published: {
        get:           (state: Document, workflowId: Workflow.Id) => Workflow.Dependency.Publication | null
        getUpdateInfo: (state: Document, workflowId: Workflow.Id) => Workflow.Dependency.Publication.UpdateInfo | null
    }
    draft: {
        get:           (state: Document, workflowId: Workflow.Id) => Workflow.Dependency.Draft | null
        getUpdateInfo: (state: Document, workflowId: Workflow.Id) => Workflow.Dependency.Draft.UpdateInfo | null
    }
    get: (state: Document, workflowId: Workflow.Id, mode: Workflow.Node.DependencyRef["mode"]) => Workflow.Dependency | null
    hasUpdate: (state: Document, workflowId: Workflow.Id, mode: Workflow.Node.DependencyRef["mode"]) => boolean
}

export const dependencySelectors: DependencySelectors = {
    doesNodeHaveUpdate: (s, nodeId) => {
        const node = s.data.nodes[nodeId];
        if (!node?.dependencyRef) 
            return false;
        
        const { workflowId, mode } = node.dependencyRef;
        if(!workflowId) 
            return false
        if (mode === "publication") 
            return workflowId in s.dependencyUpdates.published;
        return workflowId in s.dependencyUpdates.draft;
    },
    hasUpdate: (s, workflowId, mode) => {
        if(mode === "publication")
            return workflowId in s.dependencyUpdates.published
        else 
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
    get: (s, workflowId, mode) => {
        if(mode === "draft")
            return s.selectors.dependency.draft.get(s, workflowId)
        else
            return s.selectors.dependency.published.get(s, workflowId)
    }
}
