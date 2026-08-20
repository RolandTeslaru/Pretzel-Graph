"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Series = void 0;
const zod_1 = require("zod");
const event_1 = require("./event");
/**
 * A recurring group of events — a league, or a question that repeats on a schedule.
 *
 *     Series "FOMC"   monthly   -> Event "Fed Decision in July?" -> Market "25 bps increase"
 *     Series "NFL"    daily     -> Event "Commanders vs. Buccaneers"
 *
 * The top of the hierarchy. Ours: `Gamma.Series` is 29 keys and 56 KB, of which the embedded
 * `events` array is 98.5%.
 */
var Series;
(function (Series) {
    /** A series without its events — what a listing answers with. */
    let Meta;
    (function (Meta) {
        Meta.Schema = zod_1.z.object({
            id: zod_1.z.string().nullable(),
            slug: zod_1.z.string().nullable(),
            title: zod_1.z.string().nullable(),
            /** "single" on every series seen so far — kept in case it ever varies. */
            seriesType: zod_1.z.string().nullable(),
            /** "daily" for leagues, "monthly" for CPI and FOMC. */
            recurrence: zod_1.z.string().nullable(),
            active: zod_1.z.boolean().nullable(),
            closed: zod_1.z.boolean().nullable(),
            startDate: zod_1.z.string().nullable(),
            /** How many events came back, which is not how many the series has — see Schema. */
            eventCount: zod_1.z.number().int(),
        });
        Meta.fromGamma = (series) => ({
            id: series.id ?? null,
            slug: series.slug ?? null,
            title: series.title ?? null,
            seriesType: series.seriesType ?? null,
            recurrence: series.recurrence ?? null,
            active: series.active ?? null,
            closed: series.closed ?? null,
            startDate: series.startDate ?? null,
            eventCount: events(series).length,
        });
    })(Meta = Series.Meta || (Series.Meta = {}));
    const events = (series) => Array.isArray(series.events) ? series.events : [];
    Series.Schema = Meta.Schema.extend({
        /**
         * Events as references, not in full — a series is navigated through, not read.
         *
         * Incomplete and misordered, and Gamma offers nothing better: FOMC has met roughly 65 times
         * since 2021 and returns 17, sorted by `id`, which puts the 2022 backfill last because
         * those rows were imported later. The `series_id` filter on the events endpoint is
         * accepted and then ignored — it answers with unrelated events — so there is no complete
         * path to a series' events. Treat this as a sample, not a roster.
         */
        events: zod_1.z.array(event_1.Event.Ref.Schema),
    });
    Series.fromGamma = (series) => ({
        ...Meta.fromGamma(series),
        events: events(series).map(event_1.Event.Ref.fromGamma),
    });
})(Series || (exports.Series = Series = {}));
