import { Workflow } from "@pretzel-graph/shared/domain";

type NodeId = Workflow.Node.Id;

/* ─────────────────────────────────────────────────────────────────────────────
 * NOT WIRED — reference only. "Execute up until this point" is implemented at
 * RUNTIME instead: the full graph compiles/runs normally and the engine aborts
 * once the target completes (see AggexEngine `stopAtNodeId` + onNodeCompleted).
 *
 * This `collectUpstreamCone` (structural ancestor-set) was the previous approach.
 * It was parked because it walks REAL EDGES only (`incomingEdgesMap`), so it can't
 * see teleport links — Portals (Core/Routing/Portal pair by `portalId` and fire via
 * schedulerAPI.fireNode with no edge), Expose, SubWorkflow boundaries. On a
 * portal-heavy graph the cone under-collects (drops the portal's data source) and
 * the run deadlocks/feeds garbage. Kept for the parked replay idea below.
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Collect the upstream cone of `targetNodeId`: every node with a (real-edge) path TO the
 * target (its transitive ancestors), plus the target itself. Cycles are first-class; the
 * `cone` set doubles as the visited guard.
 */
export function collectUpstreamCone(
    targetNodeId: NodeId,
    cache:        Workflow.Cache,
): Set<NodeId> {
    const cone = new Set<NodeId>();

    const walk = (nodeId: NodeId): void => {
        if (cone.has(nodeId)) return;   // visited / cycle guard
        cone.add(nodeId);

        const upstreams = cache.incomingEdgesMap[nodeId] ?? {};
        for (const source of Object.keys(upstreams) as NodeId[])
            walk(source);
    };

    walk(targetNodeId);
    return cone;
}


/* ─────────────────────────────────────────────────────────────────────────────
 * PARKED IDEA (v2): replay-from-cache "Run THIS node" instead of "Run up to here"
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The original design ran only the target + the *minimal missing* upstream sub-chain,
 * replaying cached upstreams (fire-but-don't-execute) from a seeded session — n8n's
 * runData-reuse, adapted to our signal/data dependency model. It was implemented and
 * working at the graph level, then shelved. Keeping the design here in case we revisit.
 *
 * The shape:
 *   planPartialRun(target, data, cache, session) -> { mustRun, replay }
 *     - demand-driven backward walk from the target.
 *     - needsEvery(node) = signalDependency === "AND" || dataDependency === "AND"
 *         · needsEvery → each wired upstream is required:
 *             cached (output present in session) → add to `replay` (leaf, fires from START)
 *             missing                            → recurse (re-run)
 *         · !needsEvery (OR/OR) → replay cached upstreams to feed data, never force a re-run
 *           (the missing port stays undefined).
 *   Compiler: vertices = mustRun ∪ replay; prune a replay node's OWN incoming edges (it
 *   fires from __START__); replay nodes short-circuit in onNodeExecuted (return cached
 *   output instead of running), which signals downstream so getIncomingData sees them.
 *
 * WHY IT WAS SHELVED — the serialization boundary:
 *   Nodes exchange LIVE JS instances via session.node_output_instances (LangChain
 *   BaseMessage, model handles, tools, DB connections). Those exist only in worker memory
 *   for one execution. Any seed we can capture (frontend stream = projections only; DB
 *   session = JSONB) is a *serialized snapshot*, never live instances. So replay breaks in
 *   two ways:
 *     1. Data variants (Message/MessageList/Text/Json/Document/Data*) are revivable but not
 *        revived — ensureReference throws on LangChain's stored `{lc,type:"constructor"}`
 *        form. (This is the exact "Cannot coerce value into variant MessageList" error.)
 *     2. Resource/handle variants (LanguageModel/Tool/ToolList/Embeddings/VectorStore/
 *        Retriever/DB connections) are fundamentally unserializable — a live Gemini handle
 *        or Tavily tool closure can't round-trip through JSON at all.
 *
 * WHAT v2 WOULD NEED (both parts):
 *   A. Synthesizer.ensureReference/coerceMessage learn to REVIVE serialized data
 *      (LangChain: mapStoredMessagesToChatMessages / load).
 *   B. planPartialRun.isCached returns false for resource/handle variants so their provider
 *      nodes always RE-RUN (cheap — they just build a client/tool def) and yield live
 *      handles; only genuine data is replayed-and-revived.
 *   Open question to settle first: bucket every Foundations port variant into
 *   data (replay+revive) vs resource (force re-run), and confirm each data variant
 *   round-trips losslessly (DataFrame/binary are suspect).
 * ───────────────────────────────────────────────────────────────────────────── */
