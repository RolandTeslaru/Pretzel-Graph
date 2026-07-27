// Type-only, for the same reason as market.ts: the client imports these schemas.
import type { PolymarketGammaClient } from "../client"
import { Gamma } from "./Gamma"
import { Market } from "./market"

// An event groups related markets. Same reasoning as Market: ours, not Gamma's.
export namespace Event {

    // `id` is kept because it's what the live-volume endpoint takes — an event id, not a market
    // conditionId, which is the easiest of the two to confuse.
    export const compact = (event: Gamma.Event) => ({
        id:          event.id        ?? null,
        title:       event.title     ?? null,
        slug:        event.slug      ?? null,
        active:      event.active    ?? null,
        closed:      event.closed    ?? null,
        volume:      event.volume    ?? null,
        liquidity:   event.liquidity ?? null,
        endDate:     event.endDate   ?? null,
        marketCount: Array.isArray(event.markets) ? event.markets.length : null,
    })

    export type Compact = ReturnType<typeof compact>


    // For the calls where the markets inside an event are the answer rather than a count. Gamma
    // nests whole Market objects here, each carrying its own back-reference to this event and its
    // tags — a single election event is megabytes raw, so the nested markets get compacted too.
    export const withMarkets = (event: Gamma.Event) => ({
        ...compact(event),
        markets: (event.markets ?? []).map(Market.compact),
    })

    export type WithMarkets = ReturnType<typeof withMarkets>


    // Events take Market.Status directly — Gamma filters both by the same two booleans.
    export async function list(
        gamma:  PolymarketGammaClient,
        status: Market.Status,
        limit:  number,
    ): Promise<Compact[]> {
        const events = await gamma.events.list({
            ...Market.statusQuery(status),
            limit,
            order:     "volume",
            ascending: false,
        })

        return events.map(compact)
    }
}
