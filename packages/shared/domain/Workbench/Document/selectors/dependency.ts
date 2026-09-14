import type { Dependency } from "../../../Dependency";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface DependencySelectors {
    publishedWorkflow: {
        get:           (document: Document, workflowId: Workflow.Id) => Dependency.Value.Publication | null
        getUpdateInfo: (document: Document, workflowId: Workflow.Id) => Dependency.Update.Publication | Dependency.Update.Listing | null
    }
    draftWorkflow: {
        get:           (document: Document, workflowId: Workflow.Id) => Dependency.Value.Draft | null
        getUpdateInfo: (document: Document, workflowId: Workflow.Id) => Dependency.Update.Draft | null
    }
    // Reads plain workflow data only, so callers outside the editor can pass `{ data }`.
    getWorkflow: (document: { data: Pick<Workflow.Data, "dependencies"> }, workflowId: Workflow.Id, kind: Dependency.Ref.Workflow["kind"]) => Dependency | null
    hasUpdate: (document: Document, workflowId: Workflow.Id, kind: Dependency.Ref.Workflow["kind"]) => boolean
    // Every pending update in the document.
    getUpdates: (document: Document) => Dependency.Update[]
}

export const dependencySelectors: DependencySelectors = {
    getUpdates: (d) => Object.values(d.dependencyUpdates).flatMap((updates): Dependency.Update[] => Object.values(updates)),
    hasUpdate: (d, workflowId, kind) => {
        if (kind === "draftWorkflow")
            return workflowId in d.dependencyUpdates.draftWorkflow;
        return workflowId in d.dependencyUpdates.publishedWorkflow;
    },
    publishedWorkflow: {
        get:           (d, workflowId) => d.data.dependencies.publishedWorkflow[workflowId] ?? null,
        getUpdateInfo: (d, workflowId) => d.dependencyUpdates.publishedWorkflow[workflowId] ?? null,
    },
    draftWorkflow: {
        get:           (d, workflowId) => d.data.dependencies.draftWorkflow[workflowId] ?? null,
        getUpdateInfo: (d, workflowId) => d.dependencyUpdates.draftWorkflow[workflowId] ?? null,
    },
    getWorkflow: (d, workflowId, kind) => {
        const store = kind === "draftWorkflow"
            ? d.data.dependencies.draftWorkflow
            : d.data.dependencies.publishedWorkflow;

        return store[workflowId] ?? null;
    },
}
