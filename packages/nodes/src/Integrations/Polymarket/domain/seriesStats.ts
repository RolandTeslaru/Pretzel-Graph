import { z } from "zod"

import { Gamma } from "./Gamma"


/**
 * How a series is trading. The counterpart to MarketStats and EventStats.
 *
 * Less trustworthy than either: `volume` is populated for some series and zero for others — FOMC
 * reports 114M and MLB 4.4M, while NFL, NBA, NHL, EPL and CPI all report 0 despite having live
 * events. A zero here means "not reported", not "no trading".
 */
export namespace SeriesStats {

    export const Schema = z.object({
        seriesId: z.string().nullable(),

        volume:     z.number().nullable(),
        volume24hr: z.number().nullable(),
        liquidity:  z.number().nullable(),

        competitive:  z.number().nullable(),
        commentCount: z.number().nullable(),
    })


    export const fromGamma = (series: Gamma.Series): SeriesStats => ({
        seriesId: series.id ?? null,

        volume:     series.volume     ?? null,
        volume24hr: series.volume24hr ?? null,
        liquidity:  series.liquidity  ?? null,

        // Gamma sends this as the string "0" on a series and a number elsewhere.
        competitive:  Gamma.Common.LooseNumber.parse(series.competitive ?? null),
        commentCount: series.commentCount ?? null,
    })
}

export type SeriesStats = z.infer<typeof SeriesStats.Schema>
