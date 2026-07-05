import type { Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";

export interface EdgeSelectors {
    get:    (state: WorkbenchSDK.State, edgeId: Workflow.Edge.Id) => Workflow.Edge | null
    getAll: (state: WorkbenchSDK.State) => Record<Workflow.Edge.Id, Workflow.Edge>
}

// data.edges is id-only; the fat {id, source, target} form lives in the cache (rebuilt by
// createCache / edge reducers). All object reads go through here.
export const edgeSelectors = {
    get:    (s, edgeId) => s.cache.edges[edgeId] ?? null,
    getAll: (s) => s.cache.edges,
} satisfies EdgeSelectors
