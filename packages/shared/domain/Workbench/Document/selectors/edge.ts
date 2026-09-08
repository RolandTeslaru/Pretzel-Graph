import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface EdgeSelectors {
    get:    (document: Document, edgeId: Workflow.Edge.Id) => Workflow.Edge | null
    getAll: (document: Document) => Record<Workflow.Edge.Id, Workflow.Edge>
}

// data.edges is id-only; the fat {id, source, target} form lives in the cache (rebuilt by
// createCache / edge reducers). All object reads go through here.
export const edgeSelectors: EdgeSelectors = {
    get:    (d, edgeId) => d.cache.edges[edgeId] ?? null,
    getAll: (d) => d.cache.edges,
}
