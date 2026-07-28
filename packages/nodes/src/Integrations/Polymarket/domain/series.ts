import { z } from "zod"

import { Event } from "./event"
import { Gamma } from "./Gamma"


/**
 * A recurring group of events — a league, or a question that repeats on a schedule.
 *
 *     Series "FOMC"   monthly   -> Event "Fed Decision in July?" -> Market "25 bps increase"
 *     Series "NFL"    daily     -> Event "Commanders vs. Buccaneers"
 *
 * The top of the hierarchy. Ours: `Gamma.Series` is 29 keys and 56 KB, of which the embedded
 * `events` array is 98.5%.
 */
export namespace Series {

    /** A series without its events — what a listing answers with. */
    export namespace Meta {

        export const Schema = z.object({
            id:    z.string().nullable(),
            slug:  z.string().nullable(),
            title: z.string().nullable(),

            /** "single" on every series seen so far — kept in case it ever varies. */
            seriesType: z.string().nullable(),
            /** "daily" for leagues, "monthly" for CPI and FOMC. */
            recurrence: z.string().nullable(),

            active:    z.boolean().nullable(),
            closed:    z.boolean().nullable(),
            startDate: z.string().nullable(),

            /** How many events came back, which is not how many the series has — see Schema. */
            eventCount: z.number().int(),
        })

        export const fromGamma = (series: Gamma.Series): Meta => ({
            id:    series.id    ?? null,
            slug:  series.slug  ?? null,
            title: series.title ?? null,

            seriesType: series.seriesType ?? null,
            recurrence: series.recurrence ?? null,

            active:    series.active    ?? null,
            closed:    series.closed    ?? null,
            startDate: series.startDate ?? null,

            eventCount: events(series).length,
        })
    }

    export type Meta = z.infer<typeof Meta.Schema>


    const events = (series: Gamma.Series): Gamma.Event[] =>
        Array.isArray(series.events) ? series.events as Gamma.Event[] : []


    export const Schema = Meta.Schema.extend({
        /**
         * Events as references, not in full — a series is navigated through, not read.
         *
         * Incomplete and misordered, and Gamma offers nothing better: FOMC has met roughly 65 times
         * since 2021 and returns 17, sorted by `id`, which puts the 2022 backfill last because
         * those rows were imported later. The `series_id` filter on the events endpoint is
         * accepted and then ignored — it answers with unrelated events — so there is no complete
         * path to a series' events. Treat this as a sample, not a roster.
         */
        events: z.array(Event.Ref.Schema),
    })


    export const fromGamma = (series: Gamma.Series): Series => ({
        ...Meta.fromGamma(series),
        events: events(series).map(Event.Ref.fromGamma),
    })
}

export type Series = z.infer<typeof Series.Schema>
