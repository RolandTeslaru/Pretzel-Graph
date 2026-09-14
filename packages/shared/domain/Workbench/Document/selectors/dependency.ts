import type { Dependency } from "../../../Dependency";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface DependencySelectors {
    doesNodeHaveUpdate: (document: Document, nodeId: Workflow.Node.Id) => boolean
    publishedWorkflows: {
        get:           (document: Document, workflowId: Workflow.Id) => Dependency.Value.Publication | null
        getUpdateInfo: (document: Document, workflowId: Workflow.Id) => Dependency.Update.Publication | null
    }
    draftWorkflows: {
        get:           (document: Document, workflowId: Workflow.Id) => Dependency.Value.Draft | null
        getUpdateInfo: (document: Document, workflowId: Workflow.Id) => Dependency.Update.Draft | null
    }
    // Reads plain workflow data only, so callers outside the editor can pass `{ data }`.
    getWorkflow: (document: { data: Pick<Workflow.Data, "dependencies"> }, workflowId: Workflow.Id, kind: Dependency.Ref.Workflow["kind"]) => Dependency | null
    hasUpdate: (document: Document, workflowId: Workflow.Id, kind: Dependency.Ref.Workflow["kind"]) => boolean
}

export const dependencySelectors: DependencySelectors = {
    doesNodeHaveUpdate: (d, nodeId) => {
        const shapeDepRef = d.selectors.node.getShapeDependencyRef(d, nodeId);
        if (!shapeDepRef?.id)
            return false;

        if (shapeDepRef.kind === "draft")
            return shapeDepRef.id in d.dependencyUpdates.draftWorkflows;
        return shapeDepRef.id in d.dependencyUpdates.publishedWorkflows;
    },
    hasUpdate: (d, workflowId, kind) => {
        if (kind === "draft")
            return workflowId in d.dependencyUpdates.draftWorkflows;
        return workflowId in d.dependencyUpdates.publishedWorkflows;
    },
    publishedWorkflows: {
        get:           (d, workflowId) => d.data.dependencies.publishedWorkflows[workflowId] ?? null,
        getUpdateInfo: (d, workflowId) => d.dependencyUpdates.publishedWorkflows[workflowId] ?? null,
    },
    draftWorkflows: {
        get:           (d, workflowId) => d.data.dependencies.draftWorkflows[workflowId] ?? null,
        getUpdateInfo: (d, workflowId) => d.dependencyUpdates.draftWorkflows[workflowId] ?? null,
    },
    getWorkflow: (d, workflowId, kind) => {
        const store = kind === "draft"
            ? d.data.dependencies.draftWorkflows
            : d.data.dependencies.publishedWorkflows;

        return store[workflowId] ?? null;
    },
}
