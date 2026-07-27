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


    // "all" isn't a filter Gamma can express, so it takes two requests and a merge. Ordering by
    // volume across the union means re-sorting after the fact rather than trusting either page.
    export async function list(
        gamma:  PolymarketGammaClient,
        status: Status,
        limit:  number,
    ): Promise<Compact[]> {
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
            markets.map(market => [market.id ?? market.slug ?? JSON.stringify(market), compact(market)]),
        )

        return [...unique.values()]
            .sort((left, right) => Number(right.volume ?? 0) - Number(left.volume ?? 0))
            .slice(0, limit)
    }

    // Gamma has no full-text parameter, so the match happens here over a deliberately wider page —
    // otherwise a query would only ever search the top `limit` markets by volume.
    export async function search(
        gamma:  PolymarketGammaClient,
        args:   { query?: string; status: Status; limit: number },
    ): Promise<Compact[]> {
        const query = (args.query ?? "").trim().toLowerCase()

        if (!query)
            return list(gamma, args.status, args.limit)

        const markets = await list(gamma, args.status, Math.max(args.limit, 100))

        return markets
            .filter(market =>
                (market.question ?? "").toLowerCase().includes(query)
                || (market.slug ?? "").toLowerCase().includes(query))
            .slice(0, args.limit)
    }
}
