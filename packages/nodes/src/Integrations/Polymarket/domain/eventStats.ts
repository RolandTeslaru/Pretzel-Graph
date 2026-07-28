import { z } from "zod"

import { Gamma } from "./Gamma"


/**
 * How an event is trading, aggregated across its markets. The counterpart to MarketStats.
 *
 * Gamma sums these itself — an event's `volume` is the total across all its markets, not a figure
 * the event earned on its own. Nothing here is computed by us.
 */
export namespace EventStats {

    export const Schema = z.object({
        /** Carried so a stats object stands on its own once separated from its event. */
        eventId: z.string().nullable(),

        volume:     z.number().nullable(),
        volume24hr: z.number().nullable(),
        volume1wk:  z.number().nullable(),
        volume1mo:  z.number().nullable(),
        volume1yr:  z.number().nullable(),
        liquidity:  z.number().nullable(),

        /** Total value currently riding on the event. Markets have no equivalent. */
        openInterest: z.number().nullable(),

        /** Polymarket's own contested-ness score. Undocumented, roughly 0-1. */
        competitive:  z.number().nullable(),
        commentCount: z.number().nullable(),
    })


    export const fromGamma = (event: Gamma.Event): EventStats => ({
        eventId: event.id ?? null,

        volume:     event.volume     ?? null,
        volume24hr: event.volume24hr ?? null,
        volume1wk:  event.volume1wk  ?? null,
        volume1mo:  event.volume1mo  ?? null,
        volume1yr:  event.volume1yr  ?? null,
        liquidity:  event.liquidity  ?? null,

        openInterest: event.openInterest ?? null,

        competitive:  typeof event.competitive === "number" ? event.competitive : null,
        commentCount: event.commentCount ?? null,
    })
}

export type EventStats = z.infer<typeof EventStats.Schema>
