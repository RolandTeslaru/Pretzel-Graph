// Type-only: the client imports these schemas, so a value import would make domain <-> client
// circular at runtime. Erased at compile time, so it can't.
import type { PolymarketGammaClient } from "../client"
import { Gamma } from "./Gamma"

// Ours rather than Polymarket's. The Gamma/CLOB/Data namespaces describe each API's stable, useful
// surface; this is how we talk about a market across them.
export namespace Market {

    // Gamma has no status parameter, only independent `active` and `closed` booleans. "all" is our
    // affordance for "don't filter", which is why it can't be expressed as a single query.
    export type Status = "active" | "closed" | "all"

    export const statusQuery = (status: Status): { active?: boolean; closed?: boolean } => {
        if (status === "active")
            return { active: true, closed: false }

        if (status === "closed")
            return { closed: true }

        return {}
    }

    // `conditionId` and `clobTokenIds` are kept deliberately: they're the ids every other operation
    // takes, so whoever holds a market already holds what the next call needs.
    export const compact = (market: Gamma.Market) => ({
        id:            market.id            ?? null,
        question:      market.question      ?? null,
        slug:          market.slug          ?? null,
        conditionId:   market.conditionId   ?? null,
        active:        market.active        ?? null,
        closed:        market.closed        ?? null,
        outcomes:      market.outcomes      ?? null,
        outcomePrices: market.outcomePrices ?? null,
        clobTokenIds:  market.clobTokenIds  ?? null,
        volume:        market.volume        ?? null,
        liquidity:     market.liquidity     ?? null,
        endDate:       market.endDate       ?? null,
    })

    export type Compact = ReturnType<typeof compact>


    /**
     * A market plus the event that groups it — for results where the market stands on its own.
     *
     * Only useful at the top level. Inside `Event.withMarkets` the parent is the event you just
     * asked for, so repeating its slug on all 128 nested markets is pure weight.
     */
    export const compactWithEvent = (market: Gamma.Market) => ({
        ...compact(market),
        ...parentEvent(market),
    })

    export type CompactWithEvent = ReturnType<typeof compactWithEvent>

    // Gamma types this back-reference as unknown to keep the schema non-recursive, so it's read
    // defensively rather than parsed.
    const parentEvent = (market: Gamma.Market) => {
        const [event] = (market.events ?? []) as Array<{ id?: unknown; slug?: unknown } | undefined>

        return {
            eventId:   typeof event?.id === "string" || typeof event?.id === "number"
                ? String(event.id)
                : null,
            eventSlug: typeof event?.slug === "string" ? event.slug : null,
        }
    }


    export const matchesStatus = (market: Compact, status: Status): boolean => {
        if (status === "active")
            return market.active === true && market.closed !== true

        if (status === "closed")
            return market.closed === true

        return true
    }


    // "all" isn't a filter Gamma can express, so it takes two requests and a merge. Ordering by
    // volume across the union means re-sorting after the fact rather than trusting either page.
    export async function list(
        gamma:  PolymarketGammaClient,
        status: Status,
        limit:  number,
    ): Promise<CompactWithEvent[]> {
        const request = {
            limit,
            order:     "volume",
            ascending: false,
        } as const

        const markets = status === "all"
            ? (await Promise.all([
                gamma.markets.list({ ...request, active: true, closed: false }),
                gamma.markets.list({ ...request, closed: true }),
            ])).flat()
            : await gamma.markets.list({ ...request, ...statusQuery(status) })

        const unique = new Map(
            markets.map(market => [
                market.id ?? market.slug ?? JSON.stringify(market),
                compactWithEvent(market),
            ]),
        )

        return [...unique.values()]
            .sort((left, right) => Number(right.volume ?? 0) - Number(left.volume ?? 0))
            .slice(0, limit)
    }


    /**
     * Searches markets through Gamma's own search index.
     *
     * Gamma's list endpoints have no full-text parameter, so this used to substring-match a page of
     * markets sorted by volume — which meant a query only ever searched the top N markets, and
     * matched nothing unless the whole phrase appeared verbatim. "2028 presidential election
     * winner" returned nothing while "2028" returned three.
     *
     * /public-search matches properly, but answers with events; the markets hang off them. Results
     * are ranked by how many query terms a market's own question matches, then by volume, so
     * "marco rubio 2028" surfaces the Rubio market rather than the biggest market beside it.
     */
    export async function search(
        gamma: PolymarketGammaClient,
        args:  { query?: string; status: Status; limit: number },
    ): Promise<CompactWithEvent[]> {
        const query = (args.query ?? "").trim()

        if (!query)
            return list(gamma, args.status, args.limit)

        const results = await gamma.search.public({
            q:              query,
            limit_per_type: Math.min(Math.max(args.limit, 20), 500),
        })

        const markets = (results.events ?? []).flatMap(event =>
            (event.markets ?? []).map(market => ({
                ...compact(market),
                eventId:   event.id   ?? null,
                eventSlug: event.slug ?? null,
            })),
        )

        const unique = new Map(
            markets.map(market => [
                market.conditionId ?? market.id ?? JSON.stringify(market),
                market,
            ]),
        )

        const terms = query.toLowerCase().split(/\s+/).filter(Boolean)

        const relevance = (market: CompactWithEvent) => {
            const text = `${market.question ?? ""} ${market.slug ?? ""}`.toLowerCase()

            return terms.filter(term => text.includes(term)).length
        }

        return [...unique.values()]
            .filter(market => matchesStatus(market, args.status))
            .sort((left, right) =>
                relevance(right) - relevance(left)
                || Number(right.volume ?? 0) - Number(left.volume ?? 0))
            .slice(0, args.limit)
    }
}
