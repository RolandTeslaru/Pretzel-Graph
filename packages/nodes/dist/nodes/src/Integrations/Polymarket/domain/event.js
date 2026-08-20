"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const zod_1 = require("zod");
const market_1 = require("./market");
const tag_1 = require("./tag");
/**
 * A set of related markets under one question — "Fed Decision in July?" holding one market per
 * bracket, "Democratic Presidential Nominee 2028" holding one per candidate.
 *
 * An event is not tradeable and has no price of its own. Ours rather than Gamma's: `Gamma.Event` is
 * the 53-key wire mirror, and it always arrives with every one of its markets embedded in full —
 * 413 KB for a 128-market event, with no parameter to suppress them.
 */
var Event;
(function (Event) {
    /**
     * Just enough to name an event and go fetch it — for places where an event is a pointer rather
     * than the answer, like the list a Series carries.
     */
    let Ref;
    (function (Ref) {
        Ref.Schema = zod_1.z.object({
            id: zod_1.z.string().nullable(),
            slug: zod_1.z.string().nullable(),
            title: zod_1.z.string().nullable(),
            closed: zod_1.z.boolean().nullable(),
        });
        Ref.fromGamma = (event) => ({
            id: event.id ?? null,
            slug: event.slug ?? null,
            title: event.title ?? null,
            closed: event.closed ?? null,
        });
    })(Ref = Event.Ref || (Event.Ref = {}));
    /**
     * An event without its markets — what a listing answers with, where the question is which
     * event rather than what's inside it. `marketCount` says how many were left out.
     */
    let Meta;
    (function (Meta) {
        Meta.Schema = Ref.Schema.extend({
            active: zod_1.z.boolean().nullable(),
            endDate: zod_1.z.string().nullable(),
            /** Summed across its markets by Gamma, not by us. Windows live on EventStats. */
            volume: zod_1.z.number().nullable(),
            liquidity: zod_1.z.number().nullable(),
            /** Total value currently riding on it. No market equivalent. */
            openInterest: zod_1.z.number().nullable(),
            /** Exactly one of its markets can resolve Yes, enforced on-chain. */
            negRisk: zod_1.z.boolean().nullable(),
            negRiskMarketId: zod_1.z.string().nullable(),
            /** The recurring group this event belongs to — "fomc" for a monthly Fed decision. */
            seriesSlug: zod_1.z.string().nullable(),
            tags: zod_1.z.array(tag_1.Tag.Schema),
            /** Every market it has, including unlaunched placeholder slots. */
            marketCount: zod_1.z.number().int(),
            /** The ones that actually exist — `markets` carries exactly these. */
            activeMarketCount: zod_1.z.number().int(),
        });
        Meta.fromGamma = (event) => ({
            ...Ref.fromGamma(event),
            active: event.active ?? null,
            endDate: event.endDate ?? null,
            volume: event.volume ?? null,
            liquidity: event.liquidity ?? null,
            openInterest: event.openInterest ?? null,
            negRisk: event.negRisk ?? null,
            negRiskMarketId: event.negRiskMarketID ?? null,
            seriesSlug: event.seriesSlug ?? null,
            tags: (event.tags ?? []).map(tag_1.Tag.fromGamma),
            marketCount: markets(event).length,
            activeMarketCount: liveMarkets(event).length,
        });
    })(Meta = Event.Meta || (Event.Meta = {}));
    const markets = (event) => Array.isArray(event.markets) ? event.markets : [];
    /**
     * Drops the unlaunched placeholder slots — "Person CP", `active: false`, no price, no volume.
     * Three quarters of the 2028 nomination event is those, and an agent asked who is leading
     * should not receive 76 rows of nulls.
     *
     * Safe on resolved events: a settled market keeps `active: true` and gains `closed: true` with
     * prices of [1, 0], so filtering here never empties a finished event.
     */
    const liveMarkets = (event) => markets(event).filter(market => market.active === true);
    Event.Schema = Meta.Schema.extend({
        /**
         * The resolution rules — what has to happen for a market here to pay.
         *
         * Only on the full event, never on Meta: it is ~800 characters, and it was half of every
         * listing when Meta carried it. You read the rules of an event you have chosen, not of
         * twenty you are scanning past.
         */
        description: zod_1.z.string().nullable(),
        /** How many of `activeMarketCount` are in `markets`. Lower when filtered. */
        marketsShown: zod_1.z.number().int(),
        /** Longest odds first. */
        markets: zod_1.z.array(market_1.Market.Ref.Schema),
    });
    /**
     * What the market is trading at, for ordering. Yes on a binary market, else the first side.
     *
     * Null when there is no price at all, which `minPrice` treats as "keep": a market can only be
     * excluded for trading below the floor, never for being unreadable. Without that, anything
     * that broke price decoding would empty every event instead of failing visibly.
     */
    const leadPrice = (market) => {
        const yes = market.outcomes.find(outcome => outcome.outcome === "Yes");
        return (yes ?? market.outcomes[0])?.price ?? null;
    };
    /**
     * With its markets as references — see Market.Ref for why they aren't full markets.
     *
     * Sorted by price because the question asked of an event is almost always "who is leading",
     * and unsorted that costs a full scan. Filtering is opt-in: `activeMarketCount` keeps saying
     * how many exist, so a trimmed view can't be mistaken for the whole field.
     */
    Event.fromGamma = (event, options = {}) => {
        const ranked = liveMarkets(event)
            .map(market_1.Market.Ref.fromGamma)
            .sort((left, right) => (leadPrice(right) ?? 0) - (leadPrice(left) ?? 0));
        const minPrice = options.minPrice ?? 0;
        const kept = minPrice > 0
            ? ranked.filter(market => (leadPrice(market) ?? Infinity) >= minPrice)
            : ranked;
        const markets = options.limit !== undefined ? kept.slice(0, options.limit) : kept;
        return {
            ...Meta.fromGamma(event),
            description: event.description ?? null,
            marketsShown: markets.length,
            markets,
        };
    };
})(Event || (exports.Event = Event = {}));
