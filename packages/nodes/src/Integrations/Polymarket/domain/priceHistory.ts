import { z } from "zod"

import { CLOB } from "./CLOB"
import { Gamma } from "./Gamma"
import { Market } from "./market"


/**
 * What one outcome token has cost over time.
 *
 * Two problems with the CLOB's series. It says nothing about whose prices these are — the response
 * is a bare list of `{t, p}`, so a caller holding the wrong token id gets a plausible answer and no
 * way to notice. Everything above `history` here is that missing answer, resolved from the token
 * rather than echoed back from the request, so a mismatch shows up as the wrong name.
 *
 * And it is mostly repetition: a year at daily fidelity is ~367 points where the price sat
 * unchanged for weeks at a stretch. `summary` carries what a trend question actually needs, and
 * the series is sampled down to something readable — `points` still reports the true total.
 */
export namespace PriceHistory {

    export const DEFAULT_POINTS = 60

    export const Point = z.object({
        /** ISO date. Unix seconds are unreadable, and the whole series shares one year. */
        t: z.string(),
        p: z.number(),
    })

    export type Point = z.infer<typeof Point>


    export const Schema = z.object({
        /** Whose series this is. Null when the token matches no known market. */
        tokenId:        z.string(),
        outcome:        z.string().nullable(),
        question:       z.string().nullable(),
        groupItemTitle: z.string().nullable(),
        conditionId:    z.string().nullable(),
        marketId:       z.string().nullable(),

        interval: z.string(),
        /** How many readings exist, before sampling. */
        readings: z.number().int(),

        first: z.number().nullable(),
        last:  z.number().nullable(),
        low:   z.number().nullable(),
        high:  z.number().nullable(),
        /** `last` minus `first`, in percentage points — "Newsom fell 10 points". */
        changePct: z.number().nullable(),

        history: z.array(Point),
    })


    /** Evenly spaced, and always ending on the most recent reading — the one that matters most. */
    const sample = <T>(series: readonly T[], max: number): T[] => {
        if (series.length <= max)
            return [...series]

        const stride = (series.length - 1) / (max - 1)
        const picked = Array.from({ length: max }, (_, index) =>
            series[Math.round(index * stride)])

        picked[max - 1] = series[series.length - 1]

        return picked
    }

    const date = (seconds: number): string =>
        new Date(seconds * 1000).toISOString().slice(0, 10)

    const round = (value: number): number => Number(value.toFixed(4))


    export const fromCLOB = (args: {
        tokenId:  string
        series:   ReadonlyArray<z.infer<typeof CLOB.MarketData.PricePoint>>
        interval: string
        /** The market this token belongs to, when it could be resolved. */
        market?:  Gamma.Market | null
        points?:  number
    }): PriceHistory => {

        const series = args.series
        const prices = series.map(point => point.p)

        const first = prices.at(0)  ?? null
        const last  = prices.at(-1) ?? null

        const market = args.market ?? null
        const token  = market
            ? Market.tokens(market).find(candidate => candidate.id === args.tokenId)
            : undefined

        return {
            tokenId:        args.tokenId,
            outcome:        token?.outcome          ?? null,
            question:       market?.question        ?? null,
            groupItemTitle: market?.groupItemTitle  ?? null,
            conditionId:    market?.conditionId     ?? null,
            marketId:       market?.id != null ? String(market.id) : null,

            interval: args.interval,
            readings: series.length,

            first,
            last,
            low:       prices.length ? Math.min(...prices) : null,
            high:      prices.length ? Math.max(...prices) : null,
            changePct: first !== null && last !== null ? round((last - first) * 100) : null,

            history: sample(series, args.points ?? DEFAULT_POINTS)
                .map(point => ({ t: date(point.t), p: point.p })),
        }
    }
}

export type PriceHistory = z.infer<typeof PriceHistory.Schema>
