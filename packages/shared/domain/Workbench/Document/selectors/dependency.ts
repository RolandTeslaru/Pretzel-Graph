import { Dependency } from "../../../Dependency";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface DependencySelectors {
    // The snapshot a ref points at; reads plain workflow data only, so callers outside the editor can pass `{ data }`.
    get: (document: { data: Pick<Workflow.Data, "dependencies"> }, ref: Dependency.Ref) => Dependency.Value | null
    // Whether the dependency a ref points at has a pending update.
    hasUpdate: (document: Document, ref: Dependency.Ref) => boolean
    // Every pending update in the document.
    getUpdates: (document: Document) => Dependency.Update[]
}

export const dependencySelectors: DependencySelectors = {
    get: (d, ref) =>
        d.data.dependencies[Dependency.createId(ref)] ?? null,
    getUpdates: (d) =>
        Object.values(d.dependencyUpdates),
    hasUpdate: (d, ref) =>
        Dependency.createId(ref) in d.dependencyUpdates,
}
