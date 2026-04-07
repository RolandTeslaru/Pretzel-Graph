import { LC } from "../langchain";
import { Foundations } from "@vx-agent-editor/shared/domain";
import { Synthesizer } from "./index";

// ─── Deep Projection ────────────────────────────────────────
// Walks a value tree and replaces every LangChain class instance
// with its flat projection shape (the same shape produced by
// Synthesizer.project). The resulting tree is a plain object/array/
// primitive graph — safe to hand to JSON.stringify, safe to inline
// into an expression string, safe to send over the wire.
//
// Why a pre-walker instead of a JSON.stringify replacer function:
//   Per spec, JSON.stringify calls `toJSON()` on a value BEFORE invoking
//   the replacer. LC's Serializable base class defines toJSON, so by
//   the time a replacer fires, the instance has already been flattened
//   to `{lc, type, id, kwargs}` — `instanceof LC.BaseMessage` will never
//   match. Pre-walking lets us inspect raw instances via instanceof and
//   dispatch to the existing Synthesizer.project variant helpers.
//
// Each projected LC leaf is tagged with a `__lc` marker so the frontend
// inspector (and any downstream consumer) can tell what the value
// originally was without reconstructing it.
// ─────────────────────────────────────────────────────────────


/**
 * Infer the port variant for an LC class instance.
 * Returns null for anything that isn't an LC class we project.
 */
function inferLcVariant(value: any): Foundations.Port.Variant | null {
    if (value instanceof LC.BaseMessage)       return "Message";
    if (value instanceof LC.Document)          return "Document";
    if (value instanceof LC.BaseLanguageModel) return "LanguageModel";
    if (value instanceof LC.Embeddings)        return "Embeddings";
    if (value instanceof LC.Tool)              return "Tool";
    if (value instanceof LC.BaseRetriever)     return "Retriever";
    if (value instanceof LC.VectorStore)       return "VectorStore";
    return null;
}


/**
 * Recursively project a value. LC instances are flattened via
 * Synthesizer.project; arrays and plain objects are walked; primitives
 * pass through. Tracks visited objects to survive circular references.
 */
export function projectDeep(value: any, seen: WeakSet<object> = new WeakSet()): any {
    // Primitives (including null, undefined, string, number, boolean, bigint, symbol)
    if (value === null || typeof value !== "object")
        return value;

    // Circular reference guard
    if (seen.has(value))
        return "[Circular]";
    seen.add(value);

    // LC class instance — project, then recurse into the projection in case
    // the projected shape still contains nested LC instances (e.g. an
    // additional_kwargs blob that carries a Document).
    const variant = inferLcVariant(value);
    if (variant) {
        const projected = Synthesizer.project(value, variant);
        const deep = projectDeep(projected, seen);

        // Attach the __lc marker to object-shaped projections. Array-shaped
        // projections (MessageList, ToolList) carry the marker per-element
        // via the recursion above, so no wrapping is needed here.
        if (deep !== null && typeof deep === "object" && !Array.isArray(deep))
            return { ...deep, __lc: variant };

        return deep;
    }

    // Arrays — recurse element-wise
    if (Array.isArray(value))
        return value.map(v => projectDeep(v, seen));

    // Plain objects — recurse value-wise
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value))
        result[k] = projectDeep(v, seen);
    return result;
}


/**
 * Convenience: project-then-stringify in one call. Drop-in replacement
 * for `JSON.stringify(value)` anywhere that value might contain LC
 * class instances.
 */
export function stringify(value: any, space?: string | number): string {
    return JSON.stringify(projectDeep(value), null, space);
}
