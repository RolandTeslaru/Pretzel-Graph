/**
 * A size ceiling for what a tool hands back to a model.
 *
 * A tool result goes straight into the agent's context, so a vendor that decides to nest one more
 * array can push a workflow past the model's limit. That failure surfaces as a 400 from the model
 * provider — nowhere near the tool that caused it, and only once the run is already expensive. Put
 * every tool return through here and the ceiling holds whatever the API does next.
 *
 * Truncation is always reported in the payload. A silently shortened list is worse than a long
 * one: the model draws conclusions from a list it believes is complete.
 */
export namespace ToolBudget {

    /** Roughly 10k tokens of JSON. Past this a result stops helping the model well before it breaks it. */
    export const DEFAULT_MAX_BYTES = 40_000

    export type Options = {
        maxBytes?: number
        /** How the caller should narrow the request. Surfaced to the model when trimming happens. */
        hint?:     string
    }


    const encode = (value: unknown): string =>
        JSON.stringify(value) ?? "null"

    const bytes = (json: string): number =>
        Buffer.byteLength(json, "utf8")


    // Keeping nothing and keeping some are different failures with opposite remedies. "Trimmed to
    // fit" on an empty list reads as "too many results, narrow it" — so a caller narrows a query
    // that was already returning the right hits, and every retry empties itself the same way.
    const reason = (kept: number, maxBytes: number): string =>
        kept === 0
            ? `Nothing fit: a single item is larger than the ${maxBytes}-byte limit for one tool result. Narrowing this call will not help — ask for a summary shape instead, or fetch one item at a time.`
            : `Trimmed to fit the ${maxBytes}-byte limit for one tool result.`


    /**
     * Serializes a list result, dropping items from the end until it fits.
     *
     * `count` always describes what is actually present, so a model reading the payload without
     * noticing `_truncated` still isn't misled about how many items it received.
     */
    export function list<T>(
        name:    string,
        items:   readonly T[],
        options: Options = {},
    ): string {

        const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES

        const build = (kept: readonly T[]) => ({
            count: kept.length,
            ...(kept.length < items.length
                ? {
                    _truncated: {
                        of:     items.length,
                        reason: reason(kept.length, maxBytes),
                        ...(options.hint && kept.length > 0 ? { hint: options.hint } : {}),
                    },
                }
                : {}),
            [name]: kept,
        })

        const full = encode(build(items))

        if (bytes(full) <= maxBytes)
            return full

        // Largest prefix that fits. Item sizes vary enough that a ratio guess undershoots badly.
        let low  = 0
        let high = items.length

        while (low < high) {
            const mid = Math.ceil((low + high) / 2)

            if (bytes(encode(build(items.slice(0, mid)))) <= maxBytes)
                low = mid
            else
                high = mid - 1
        }

        return encode(build(items.slice(0, low)))
    }


    /**
     * Serializes an arbitrary result.
     *
     * Arrays anywhere in the top level are trimmed together until the whole thing fits. An object
     * with no arrays to trim can't be shortened without inventing a shape the caller didn't ask
     * for, so it's withheld and reported instead — with the field sizes, which is what tells you
     * whether the fix is a smaller limit or a compact projection.
     */
    export function value(
        input:   unknown,
        options: Options = {},
    ): string {

        const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
        const full     = encode(input)

        if (bytes(full) <= maxBytes)
            return full

        if (Array.isArray(input))
            return list("items", input, options)

        const arrays = isRecord(input)
            ? Object.entries(input).filter(([, member]) => Array.isArray(member))
            : []

        if (!arrays.length)
            return withheld(input, full, maxBytes, options)

        const longest = Math.max(...arrays.map(([, member]) => (member as unknown[]).length))

        const build = (keep: number) => {
            const trimmed: Record<string, unknown> = { ...(input as Record<string, unknown>) }
            const dropped: Record<string, unknown> = {}

            for (const [key, member] of arrays) {
                const items = member as unknown[]

                if (items.length <= keep)
                    continue

                trimmed[key] = items.slice(0, keep)
                dropped[key] = { kept: keep, of: items.length }
            }

            if (Object.keys(dropped).length)
                trimmed._truncated = {
                    ...dropped,
                    reason: reason(keep, maxBytes),
                    ...(options.hint && keep > 0 ? { hint: options.hint } : {}),
                }

            return trimmed
        }

        let low  = 0
        let high = longest

        while (low < high) {
            const mid = Math.ceil((low + high) / 2)

            if (bytes(encode(build(mid))) <= maxBytes)
                low = mid
            else
                high = mid - 1
        }

        const trimmed = encode(build(low))

        // Every array emptied and it still doesn't fit — the weight is elsewhere.
        return bytes(trimmed) <= maxBytes
            ? trimmed
            : withheld(input, full, maxBytes, options)
    }


    const isRecord = (input: unknown): input is Record<string, unknown> =>
        typeof input === "object" && input !== null


    const withheld = (
        input:    unknown,
        full:     string,
        maxBytes: number,
        options:  Options,
    ): string => {

        const fields = isRecord(input)
            ? Object.entries(input)
                .map(([key, member]) => [key, bytes(encode(member))] as const)
                .sort((left, right) => right[1] - left[1])
                .slice(0, 5)
            : []

        return encode({
            _withheld: {
                bytes:  bytes(full),
                limit:  maxBytes,
                reason: "The result was too large to return, and had no list that could be shortened without misrepresenting it.",
                ...(options.hint ? { hint: options.hint } : {}),
                ...(fields.length ? { largestFields: Object.fromEntries(fields) } : {}),
            },
        })
    }
}
