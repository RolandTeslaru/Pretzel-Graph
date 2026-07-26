import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";

import { Workflow } from "@pretzel-graph/shared/domain";
import { collectUpstreamCone } from "./partial";

type NodeId = Workflow.Node.Id;

/** Build a minimal Cache from `node -> [upstream node ids]`. */
function cacheOf(spec: Record<string, string[]>): Workflow.Cache {
    const nodes: Record<string, any> = {};
    const edges: Record<string, any> = {};
    for (const [id, froms] of Object.entries(spec)) {
        nodes[id] = { id, fields: [] };
        for (const src of froms) {
            const edgeId = `${src}->${id}`;
            edges[edgeId] = {
                id: edgeId,
                source: { nodeId: src, portId: "out" },
                target: { nodeId: id,  portId: `in_${src}` },
            };
        }
    }
    // ensure source-only nodes exist
    for (const froms of Object.values(spec))
        for (const src of froms)
            if (!nodes[src]) nodes[src] = { id: src, fields: [] };

    return Workflow.createCache({ nodes, edges, staticValues: {} } as unknown as Workflow.Data, {});
}

const sorted = (set: Set<NodeId>) => [...set].sort();

test("linear chain A -> B -> T → cone is the whole chain", () => {
    const cache = cacheOf({ A: [], B: ["A"], T: ["B"] });
    assert.deepEqual(sorted(collectUpstreamCone("T" as NodeId, cache)), ["A", "B", "T"]);
});

test("downstream of target is excluded", () => {
    // A -> T -> D : running 'up to T' excludes D
    const cache = cacheOf({ A: [], T: ["A"], D: ["T"] });
    assert.deepEqual(sorted(collectUpstreamCone("T" as NodeId, cache)), ["A", "T"]);
});

test("diamond collects both branches once", () => {
    const cache = cacheOf({ A: [], L: ["A"], R: ["A"], T: ["L", "R"] });
    assert.deepEqual(sorted(collectUpstreamCone("T" as NodeId, cache)), ["A", "L", "R", "T"]);
});

test("only ancestors that actually reach the target are included", () => {
    // X feeds B (downstream-only sibling), not the cone of T
    const cache = cacheOf({ A: [], T: ["A"], B: ["A"], X: ["B"] });
    assert.deepEqual(sorted(collectUpstreamCone("T" as NodeId, cache)), ["A", "T"]);
});

test("cycle in the upstream cone does not infinite-loop", () => {
    const cache = cacheOf({ A: ["B"], B: ["A"], T: ["A"] });
    assert.deepEqual(sorted(collectUpstreamCone("T" as NodeId, cache)), ["A", "B", "T"]);
});

test("target with no upstreams → cone is just the target", () => {
    const cache = cacheOf({ T: [] });
    assert.deepEqual(sorted(collectUpstreamCone("T" as NodeId, cache)), ["T"]);
});
