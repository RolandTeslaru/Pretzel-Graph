"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Market = void 0;
const zod_1 = require("zod");
/**
 * Our market, not Polymarket's.
 *
 * `Gamma.Market` is the wire mirror — ~100 keys, theirs, free to change. This is the stable shape
 * the rest of PretzelGraph speaks, and `fromGamma` is the only thing that knows how to get from one
 * to the other. Gamma renaming a field costs one function, not every call site.
 */
var Market;
(function (Market) {
    Market.statusQuery = (status) => {
        if (status === "active")
            return { active: true, closed: false };
        if (status === "closed")
            return { closed: true };
        return {};
    };
    /**
     * One side of a market — the thing that is actually traded.
     *
     * Three APIs, three names for it: Gamma's `clobTokenIds[n]`, CLOB's `token_id`, Data's `asset`.
     * Holding one name here is most of the reason this namespace exists.
     */
    let Token;
    (function (Token) {
        /**
         * What a side is called, what it costs, and the id every pricing call takes.
         *
         * The id is 85 of the ~120 bytes here and it is the only route from a market to its price.
         * Listings carried outcomes without one for a while, on the reasoning that ids are large
         * and rarely needed; what that produced was a caller holding "Gavin Newsom, 12%" and no
         * way to chart him, which it resolved by borrowing an id from elsewhere and silently
         * charting the wrong market.
         */
        let Ref;
        (function (Ref) {
            Ref.Schema = zod_1.z.object({
                id: zod_1.z.string().nullable(),
                outcome: zod_1.z.string(),
                price: zod_1.z.number().nullable(),
            });
        })(Ref = Token.Ref || (Token.Ref = {}));
        Token.Schema = zod_1.z.object({
            id: zod_1.z.string().nullable(),
            outcome: zod_1.z.string(),
            /** Which side, 0 or 1. What Data's `outcomeIndex` refers to. */
            index: zod_1.z.number().int(),
            price: zod_1.z.number().nullable(),
            /** Only known after resolution, and never from Gamma. */
            winner: zod_1.z.boolean().nullable(),
        });
    })(Token = Market.Token || (Market.Token = {}));
    /**
     * A market as a pointer with a price on it — what an Event carries.
     *
     * Full markets don't fit: a 128-candidate event is 118 KB of them. This keeps the label, the
     * ids every other tool takes, and what each side costs, so both "who's leading" and "chart me
     * that one" are answerable from the event alone, at ~410 bytes instead of 945.
     */
    let Ref;
    (function (Ref) {
        Ref.Schema = zod_1.z.object({
            id: zod_1.z.string().nullable(),
            conditionId: zod_1.z.string().nullable(),
            /** The row label — "Gavin Newsom" rather than the whole question. */
            groupItemTitle: zod_1.z.string().nullable(),
            outcomes: zod_1.z.array(Token.Ref.Schema),
        });
        Ref.fromGamma = (market) => ({
            id: toText(market.id),
            conditionId: market.conditionId ?? null,
            groupItemTitle: market.groupItemTitle ?? null,
            outcomes: Market.tokens(market).map(({ id, outcome, price }) => ({ id, outcome, price })),
        });
    })(Ref = Market.Ref || (Market.Ref = {}));
    /**
     * What the market is, and whether it can be traded — enough to choose one from a list.
     *
     * Carries `Token.Ref`, so a result can be acted on without being fetched again. The ids are
     * 170 bytes of the ~620 here, which is the price of a listing that answers "and now chart me
     * that one" instead of handing back a row you have to look up before you can use it.
     */
    let Meta;
    (function (Meta) {
        Meta.Schema = zod_1.z.object({
            id: zod_1.z.string().nullable(),
            question: zod_1.z.string().nullable(),
            slug: zod_1.z.string().nullable(),
            conditionId: zod_1.z.string().nullable(),
            /** The row label inside its event — "Gavin Newsom" rather than the whole question. */
            groupItemTitle: zod_1.z.string().nullable(),
            outcomes: zod_1.z.array(Token.Ref.Schema),
            active: zod_1.z.boolean().nullable(),
            closed: zod_1.z.boolean().nullable(),
            /** Distinct from `active`: a live market can have its book closed. */
            acceptingOrders: zod_1.z.boolean().nullable(),
            endDate: zod_1.z.string().nullable(),
            /** "proposed" once an outcome has been submitted to UMA's oracle and the challenge
             *  window is open — the market is mid-settlement and the price may not reflect it.
             *  Null on 199 of 200 markets sampled. */
            resolutionStatus: zod_1.z.string().nullable(),
            /** Headline size. Kept here because every listing is ordered by volume, and a result
             *  sorted by a number it doesn't show reads as arbitrary. Windows live on MarketStats. */
            volume: zod_1.z.number().nullable(),
            liquidity: zod_1.z.number().nullable(),
            /** Part of a mutually-exclusive group — only one of them can resolve Yes. The group's
             *  id lives on the Event, which is the only place it means anything. */
            negRisk: zod_1.z.boolean().nullable(),
            eventId: zod_1.z.string().nullable(),
            eventSlug: zod_1.z.string().nullable(),
        });
        Meta.fromGamma = (market) => ({
            id: toText(market.id),
            question: market.question ?? null,
            slug: market.slug ?? null,
            conditionId: market.conditionId ?? null,
            groupItemTitle: market.groupItemTitle ?? null,
            outcomes: Market.tokens(market).map(({ id, outcome, price }) => ({ id, outcome, price })),
            active: market.active ?? null,
            closed: market.closed ?? null,
            acceptingOrders: market.acceptingOrders ?? null,
            endDate: market.endDate ?? null,
            resolutionStatus: market.umaResolutionStatus ?? null,
            volume: market.volumeNum ?? market.volume ?? null,
            liquidity: market.liquidityNum ?? market.liquidity ?? null,
            negRisk: market.negRisk ?? null,
            ...parentEvent(market),
        });
    })(Meta = Market.Meta || (Market.Meta = {}));
    /** Everything about one market — for when it has already been chosen. */
    Market.Schema = Meta.Schema.extend({
        /** The resolution contract: what has to happen for Yes to pay. ~400-1300 characters. */
        description: zod_1.z.string().nullable(),
        /** With the side index and the winner, which only matter once a market is chosen. */
        outcomes: zod_1.z.array(Token.Schema),
        /** The UMA question this settles against. Not the same as `conditionId`. */
        questionId: zod_1.z.string().nullable(),
        startDate: zod_1.z.string().nullable(),
        /** False means it never had a CLOB book — no prices, no order book. */
        enableOrderBook: zod_1.z.boolean().nullable(),
        tickSize: zod_1.z.number().nullable(),
        minOrderSize: zod_1.z.number().nullable(),
    });
    const toText = (value) => typeof value === "string" || typeof value === "number" ? String(value) : null;
    // Gamma types the parent back-reference as unknown to keep the schema non-recursive, so it's
    // read defensively rather than parsed. In practice a market has exactly one parent event; a
    // sample of 200 live markets found none with more and one with none.
    const parentEvent = (market) => {
        const [event] = (market.events ?? []);
        return {
            eventId: toText(event?.id),
            eventSlug: typeof event?.slug === "string" ? event.slug : null,
        };
    };
    /**
     * Gamma reports outcomes, prices and token ids as three parallel arrays that the caller is
     * expected to zip by index — and they are not always the same length. Of 108 sampled markets,
     * 32 had an empty `outcomePrices` while still carrying two outcomes and two tokens (unlaunched
     * candidate slots). Driving off `outcomes` and looking the rest up tolerantly means a missing
     * price arrives as null instead of silently reading as position 0.
     */
    // The serialized-array schemas pass a value through untouched when it isn't valid JSON, so
    // these stay `string | T[]` in the mirror. Anything that didn't decode is treated as absent.
    const asArray = (value) => Array.isArray(value) ? value : [];
    Market.tokens = (market) => asArray(market.outcomes).map((outcome, index) => ({
        id: asArray(market.clobTokenIds)[index] ?? null,
        outcome: String(outcome),
        index,
        price: asArray(market.outcomePrices)[index] ?? null,
        winner: null,
    }));
    Market.fromGamma = (market) => ({
        ...Meta.fromGamma(market),
        description: market.description ?? null,
        outcomes: Market.tokens(market),
        questionId: market.questionID ?? null,
        startDate: market.startDate ?? null,
        enableOrderBook: market.enableOrderBook ?? null,
        tickSize: market.orderPriceMinTickSize ?? null,
        minOrderSize: market.orderMinSize ?? null,
    });
    Market.matchesStatus = (market, status) => {
        if (status === "active")
            return market.active === true && market.closed !== true;
        if (status === "closed")
            return market.closed === true;
        return true;
    };
})(Market || (exports.Market = Market = {}));
