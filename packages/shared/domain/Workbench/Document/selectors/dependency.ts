import { Dependency } from "../../../Dependency";
import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface DependencySelectors {
    // The snapshot a ref points at; reads plain workflow data only, so callers outside the editor can pass `{ data }`.
    get: <R extends Dependency.Ref>(document: { data: Pick<Workflow.Data, "dependencies"> }, ref: R) => Dependency.ValueFor<R> | null
    // Whether the dependency a ref points at has a pending update.
    hasUpdate: (document: Document, ref: Dependency.Ref) => boolean
    // Every pending update in the document.
    getUpdates: (document: Document) => Dependency.Update[]
}

export const dependencySelectors: DependencySelectors = {
    get: <R extends Dependency.Ref>(d: { data: Pick<Workflow.Data, "dependencies"> }, ref: R) =>
        (d.data.dependencies[Dependency.createId(ref)] ?? null) as Dependency.ValueFor<R> | null,
    getUpdates: (d) =>
        Object.values(d.dependencyUpdates),
    hasUpdate: (d, ref) =>
        Dependency.createId(ref) in d.dependencyUpdates,
}
