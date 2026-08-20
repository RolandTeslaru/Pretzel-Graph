"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceHistory = void 0;
const zod_1 = require("zod");
const market_1 = require("./market");
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
var PriceHistory;
(function (PriceHistory) {
    PriceHistory.DEFAULT_POINTS = 60;
    PriceHistory.Point = zod_1.z.object({
        /** ISO date. Unix seconds are unreadable, and the whole series shares one year. */
        t: zod_1.z.string(),
        p: zod_1.z.number(),
    });
    PriceHistory.Schema = zod_1.z.object({
        /** Whose series this is. Null when the token matches no known market. */
        tokenId: zod_1.z.string(),
        outcome: zod_1.z.string().nullable(),
        question: zod_1.z.string().nullable(),
        groupItemTitle: zod_1.z.string().nullable(),
        conditionId: zod_1.z.string().nullable(),
        marketId: zod_1.z.string().nullable(),
        interval: zod_1.z.string(),
        /** How many readings exist, before sampling. */
        readings: zod_1.z.number().int(),
        first: zod_1.z.number().nullable(),
        last: zod_1.z.number().nullable(),
        low: zod_1.z.number().nullable(),
        high: zod_1.z.number().nullable(),
        /** `last` minus `first`, in percentage points — "Newsom fell 10 points". */
        changePct: zod_1.z.number().nullable(),
        history: zod_1.z.array(PriceHistory.Point),
    });
    /** Evenly spaced, and always ending on the most recent reading — the one that matters most. */
    const sample = (series, max) => {
        if (series.length <= max)
            return [...series];
        const stride = (series.length - 1) / (max - 1);
        const picked = Array.from({ length: max }, (_, index) => series[Math.round(index * stride)]);
        picked[max - 1] = series[series.length - 1];
        return picked;
    };
    const date = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10);
    const round = (value) => Number(value.toFixed(4));
    PriceHistory.fromCLOB = (args) => {
        const series = args.series;
        const prices = series.map(point => point.p);
        const first = prices.at(0) ?? null;
        const last = prices.at(-1) ?? null;
        const market = args.market ?? null;
        const token = market
            ? market_1.Market.tokens(market).find(candidate => candidate.id === args.tokenId)
            : undefined;
        return {
            tokenId: args.tokenId,
            outcome: token?.outcome ?? null,
            question: market?.question ?? null,
            groupItemTitle: market?.groupItemTitle ?? null,
            conditionId: market?.conditionId ?? null,
            marketId: market?.id != null ? String(market.id) : null,
            interval: args.interval,
            readings: series.length,
            first,
            last,
            low: prices.length ? Math.min(...prices) : null,
            high: prices.length ? Math.max(...prices) : null,
            changePct: first !== null && last !== null ? round((last - first) * 100) : null,
            history: sample(series, args.points ?? PriceHistory.DEFAULT_POINTS)
                .map(point => ({ t: date(point.t), p: point.p })),
        };
    };
})(PriceHistory || (exports.PriceHistory = PriceHistory = {}));
