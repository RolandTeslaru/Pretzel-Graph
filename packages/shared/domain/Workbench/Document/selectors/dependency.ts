import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface DependencySelectors {
    doesNodeHaveUpdate: (document: Document, nodeId: Workflow.Node.Id) => boolean
    publishedWorkflows: {
        get:           (document: Document, workflowId: Workflow.Id) => Workflow.Dependency.Publication | null
        getUpdateInfo: (document: Document, workflowId: Workflow.Id) => Workflow.Dependency.Publication.UpdateInfo | null
    }
    draftWorkflows: {
        get:           (document: Document, workflowId: Workflow.Id) => Workflow.Dependency.Draft | null
        getUpdateInfo: (document: Document, workflowId: Workflow.Id) => Workflow.Dependency.Draft.UpdateInfo | null
    }
    // Reads plain workflow data only, so callers outside the editor can pass `{ data }`.
    getWorkflow: (document: { data: Pick<Workflow.Data, "dependencies"> }, workflowId: Workflow.Id, mode: Workflow.Dependency.WorkflowRef["mode"]) => Workflow.Dependency | null
    hasUpdate: (document: Document, workflowId: Workflow.Id, mode: Workflow.Dependency.WorkflowRef["mode"]) => boolean
}

export const dependencySelectors: DependencySelectors = {
    doesNodeHaveUpdate: (d, nodeId) => {
        const shapeDepRef = d.selectors.node.getShapeDependencyRef(d, nodeId);
        if (!shapeDepRef?.workflowId)
            return false;

        if (shapeDepRef.mode === "publication")
            return shapeDepRef.workflowId in d.dependencyUpdates.publishedWorkflows;
        return shapeDepRef.workflowId in d.dependencyUpdates.draftWorkflows;
    },
    hasUpdate: (d, workflowId, mode) => {
        if(mode === "publication")
            return workflowId in d.dependencyUpdates.publishedWorkflows
        else
            return workflowId in d.dependencyUpdates.draftWorkflows;
    },
    publishedWorkflows: {
        get:           (d, workflowId) => d.data.dependencies.publishedWorkflows[workflowId] ?? null,
        getUpdateInfo: (d, workflowId) => d.dependencyUpdates.publishedWorkflows[workflowId] ?? null,
    },
    draftWorkflows: {
        get:           (d, workflowId) => d.data.dependencies.draftWorkflows[workflowId] ?? null,
        getUpdateInfo: (d, workflowId) => d.dependencyUpdates.draftWorkflows[workflowId] ?? null,
    },
    getWorkflow: (d, workflowId, mode) => {
        const store = mode === "publication"
            ? d.data.dependencies.publishedWorkflows
            : d.data.dependencies.draftWorkflows;

        return store[workflowId] ?? null;
    },
}
