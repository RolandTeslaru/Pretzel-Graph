/**
 * playground.ts — scratch experiment. NOT wired into the app.
 * Run: npx tsx <this file>  (or import { runPlayground } and call it)
 *
 * Goal: prove out a module-level WeakMap cache alongside a real
 * zustand + immer + zundo(temporal) store, with the same shape as
 * WorkbenchSDK (serializable Record state, reducers, actions, selectors).
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

type NodeId = string & { __brand: "NodeId" };

// Lean, serializable node — the ONLY thing that lives in the store.
interface PlaygroundNode {
    id: NodeId;
    label: string;
    value: number;
}

// Richer runtime shape — derived + non-serializable fields. NEVER in the store.
// This is what the WeakMap caches, keyed by the store node it was hydrated from.
interface HydratedPlaygroundNode {
    readonly source: PlaygroundNode;   // back-reference to the store node
    readonly squared: number;          // expensive derived value
    readonly displayName: string;      // derived
    readonly recompute: () => number;  // non-serializable (a function) — proves why it can't live in state
}

interface State {
    // Serializable, immer-friendly, diffable — like WorkbenchSDK.data
    nodes: Record<NodeId, PlaygroundNode>;
}

// ---------------------------------------------------------------------------
// Module-level WeakMap cache — lives BESIDE the store, never inside state.
// Maps a store node OBJECT -> its Hydrated view. Weak keys => a hydrated
// entry is GC'd automatically once the store node object is dropped.
// ---------------------------------------------------------------------------

const hydratedCache = new WeakMap<PlaygroundNode, HydratedPlaygroundNode>();
let computeCount = 0;

function hydrate(node: PlaygroundNode): HydratedPlaygroundNode {
    const hit = hydratedCache.get(node);
    if (hit !== undefined) return hit;

    computeCount++;                 // count real (cache-miss) hydrations
    const hydrated: HydratedPlaygroundNode = {
        source: node,
        squared: node.value * node.value,
        displayName: `${node.label} (${node.id})`,
        recompute: () => node.value * node.value,
    };
    hydratedCache.set(node, hydrated);
    return hydrated;
}

// ---------------------------------------------------------------------------
// Store — mirrors WorkbenchSDK: immer for drafts, temporal for undo/redo
// ---------------------------------------------------------------------------

const useStore = create<State>()(
    temporal(
        immer(() => ({
            nodes: {} as Record<NodeId, PlaygroundNode>,
        })),
        { limit: 5 }
    )
);

const api = useStore;
const temporalApi = (useStore as any).temporal; // zundo control surface

// ---------------------------------------------------------------------------
// Reducers — pure immer mutations
// ---------------------------------------------------------------------------

const reducers = {
    addNode(s: State, node: PlaygroundNode) {
        s.nodes[node.id] = node;
    },
    setValue(s: State, id: NodeId, value: number) {
        const n = s.nodes[id];
        if (n) n.value = value; // immer will produce a NEW node object here
    },
};

// Draft-side probe: capture what identities the WeakMap sees INSIDE a producer.
interface DraftProbe {
    draftNode: PlaygroundNode;                  // the Proxy draft
    hydratedFromDraft: HydratedPlaygroundNode;  // keyed by the proxy
}
function probeInsideDraft(id: NodeId): DraftProbe {
    let probe!: DraftProbe;
    api.setState((s) => {
        const draftNode = s.nodes[id];
        probe = { draftNode, hydratedFromDraft: hydrate(draftNode) };
    });
    return probe;
}

// ---------------------------------------------------------------------------
// Actions — side-effectful; call reducers via setState
// ---------------------------------------------------------------------------

const actions = {
    addNode(node: PlaygroundNode) {
        api.setState((s) => reducers.addNode(s, node));
    },
    setValue(id: NodeId, value: number) {
        api.setState((s) => reducers.setValue(s, id, value));
    },
};

// ---------------------------------------------------------------------------
// Selectors — read state + fold in the WeakMap cache
// ---------------------------------------------------------------------------

const selectors = {
    // Returns the rich hydrated view (from cache when possible).
    hydratedFor(s: State, id: NodeId): HydratedPlaygroundNode | undefined {
        const node = s.nodes[id];
        return node ? hydrate(node) : undefined;
    },
};

// ---------------------------------------------------------------------------
// Runnable experiment
// ---------------------------------------------------------------------------

export function runPlayground() {
    const assert = (cond: boolean, msg: string) => {
        console.log(`${cond ? "✅" : "❌"} ${msg}`);
        if (!cond) throw new Error("assertion failed: " + msg);
    };

    const A = "a" as NodeId;
    actions.addNode({ id: A, label: "A", value: 3 });

    // 1) First read hydrates, second read hits cache & returns the SAME object.
    const before = computeCount;
    const h1 = selectors.hydratedFor(api.getState(), A)!;
    const h2 = selectors.hydratedFor(api.getState(), A)!;
    assert(computeCount === before + 1, "cache hit: 2 reads -> 1 hydration");
    assert(h1 === h2, "same hydrated object identity returned from cache");
    assert(h1.squared === 9 && h1.displayName === "A (a)", "hydrated fields derived correctly");
    assert(h1.source === api.getState().nodes[A], "hydrated node back-references its store node");

    // 2) THE GOTCHA: immer produces a new store-node object on edit, so the
    //    WeakMap (keyed by the old object) MISSES and re-hydrates. Correct —
    //    stale hydrated view never leaks — automatic invalidation on every edit.
    const nodeRefOld = api.getState().nodes[A];
    actions.setValue(A, 5);
    const nodeRefNew = api.getState().nodes[A];
    assert(nodeRefOld !== nodeRefNew, "immer swapped the store node object identity");

    const beforeEdit = computeCount;
    const h3 = selectors.hydratedFor(api.getState(), A)!;
    assert(h3.squared === 25, "re-hydrated view reflects new value (25)");
    assert(h3 !== h1, "fresh hydrated object after edit (not the stale one)");
    assert(computeCount === beforeEdit + 1, "new store node -> cache miss -> re-hydrate");

    // 3) Undo via zundo: state pointer goes back to the OLD store node object,
    //    whose hydrated entry is still cached -> no re-hydration, no staleness.
    const beforeUndo = computeCount;
    temporalApi.getState().undo();
    const undoNode = api.getState().nodes[A];
    assert(undoNode === nodeRefOld, "undo restored the original store node identity");
    const h4 = selectors.hydratedFor(api.getState(), A)!;
    assert(h4 === h1, "undo returned the ORIGINAL cached hydrated object");
    assert(h4.squared === 9, "hydrated value after undo is 9");
    assert(computeCount === beforeUndo, "undo reused cached hydration -> no recompute");

    // 4) DRAFT SELECTOR — calling hydrate() inside a producer.
    //    The draft node is a throwaway Proxy; keying the WeakMap by it pollutes
    //    the cache with an entry no committed read will ever hit.
    const committedBefore = api.getState().nodes[A];
    const beforeDraft = computeCount;
    const probe = probeInsideDraft(A);

    assert(probe.draftNode !== committedBefore, "draft node is a Proxy, distinct from committed node");
    assert(probe.draftNode !== api.getState().nodes[A], "draft proxy is NOT the finalized object either");
    assert(computeCount === beforeDraft + 1, "hydrating the draft caused a real hydration (wasted work)");

    // A committed read afterwards MISSES the draft-keyed entry and hydrates again:
    const committedAfter = api.getState().nodes[A];
    const beforeCommittedRead = computeCount;
    const hCommitted = selectors.hydratedFor(api.getState(), A)!;
    assert(hCommitted !== probe.hydratedFromDraft, "committed read did NOT reuse the draft-keyed entry");
    assert(committedBefore === committedAfter, "no-op producer kept committed identity, but draft still leaked a cache entry");
    assert(computeCount === beforeCommittedRead + 1 || hCommitted === h1, "committed read re-hydrated (draft entry was useless)");

    console.log(`\nDone. total hydration-count=${computeCount} (fewer than reads => cache worked)`);
}

// Auto-run when executed directly (ESM: import.meta.main under tsx/node ≥20).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ((import.meta as any).main) {
    runPlayground();
}
