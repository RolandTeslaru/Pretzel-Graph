import { Dependency } from "../../../Dependency";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface DependencySelectors {
    // The snapshot a ref points at; reads plain workflow data only, so callers outside the editor can pass `{ data }`.
    get: (document: { data: Pick<Workflow.Data, "dependencies"> }, ref: Dependency.Ref) => Dependency.Value | null
    hasUpdate: (document: Document, workflowId: Workflow.Id, kind: Dependency.Ref.Workflow["kind"]) => boolean
    // Every pending update in the document.
    getUpdates: (document: Document) => Dependency.Update[]
}

export const dependencySelectors: DependencySelectors = {
    get: (d, ref) => 
        d.data.dependencies[Dependency.createId(ref)] ?? null,
    getUpdates: (d) => 
        Object.values(d.dependencyUpdates)
              .flatMap((updates): Dependency.Update[] => Object.values(updates)),
    hasUpdate: (d, workflowId, kind) => {
        if (kind === "draftWorkflow")
            return workflowId in d.dependencyUpdates.draftWorkflow;
        return workflowId in d.dependencyUpdates.publishedWorkflow;
    },
}
