import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface DependencySelectors {
    doesNodeHaveUpdate: (document: Document, nodeId: Workflow.Node.Id) => boolean
    published: {
        get:           (document: Document, workflowId: Workflow.Id) => Workflow.Dependency.Publication | null
        getUpdateInfo: (document: Document, workflowId: Workflow.Id) => Workflow.Dependency.Publication.UpdateInfo | null
    }
    draft: {
        get:           (document: Document, workflowId: Workflow.Id) => Workflow.Dependency.Draft | null
        getUpdateInfo: (document: Document, workflowId: Workflow.Id) => Workflow.Dependency.Draft.UpdateInfo | null
    }
    get: (document: Document, workflowId: Workflow.Id, mode: Workflow.Node.DependencyRef["mode"]) => Workflow.Dependency | null
    hasUpdate: (document: Document, workflowId: Workflow.Id, mode: Workflow.Node.DependencyRef["mode"]) => boolean
}

export const dependencySelectors: DependencySelectors = {
    doesNodeHaveUpdate: (d, nodeId) => {
        const node = d.data.nodes[nodeId];
        if (!node?.dependencyRef) 
            return false;
        
        const { workflowId, mode } = node.dependencyRef;
        if(!workflowId) 
            return false
        if (mode === "publication") 
            return workflowId in d.dependencyUpdates.published;
        return workflowId in d.dependencyUpdates.draft;
    },
    hasUpdate: (d, workflowId, mode) => {
        if(mode === "publication")
            return workflowId in d.dependencyUpdates.published
        else 
            return workflowId in d.dependencyUpdates.draft;
    },
    published: {
        get:           (d, workflowId) => d.data.dependencies.published[workflowId] ?? null,
        getUpdateInfo: (d, workflowId) => d.dependencyUpdates.published[workflowId] ?? null,
    },
    draft: {
        get:           (d, workflowId) => d.data.dependencies.draft[workflowId] ?? null,
        getUpdateInfo: (d, workflowId) => d.dependencyUpdates.draft[workflowId] ?? null,
    },
    get: (d, workflowId, mode) => {
        if(mode === "draft")
            return d.selectors.dependency.draft.get(d, workflowId)
        else
            return d.selectors.dependency.published.get(d, workflowId)
    }
}
