"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceHistory = void 0;
const zod_1 = require("zod");
var PriceHistory;
(function (PriceHistory) {
    PriceHistory.Interval = zod_1.z.union([
        zod_1.z.literal(1),
        zod_1.z.literal(60),
        zod_1.z.literal(1440),
    ]);
    PriceHistory.Window = zod_1.z.enum(["1d", "7d", "30d", "90d", "1y", "max"]);
    const Distribution = zod_1.z.object({
        open: zod_1.z.string().nullable(),
        low: zod_1.z.string().nullable(),
        high: zod_1.z.string().nullable(),
        close: zod_1.z.string().nullable(),
    });
    PriceHistory.Point = zod_1.z.object({
        endPeriod: zod_1.z.string(),
        yesBid: Distribution,
        yesAsk: Distribution,
        price: Distribution,
        volume: zod_1.z.string(),
        openInterest: zod_1.z.string(),
    });
    PriceHistory.Schema = zod_1.z.object({
        ticker: zod_1.z.string(),
        source: zod_1.z.enum(["live", "historical"]),
        intervalMinutes: PriceHistory.Interval,
        startTime: zod_1.z.string(),
        endTime: zod_1.z.string(),
        readings: zod_1.z.number().int(),
        firstPrice: zod_1.z.string().nullable(),
        lastPrice: zod_1.z.string().nullable(),
        lowPrice: zod_1.z.string().nullable(),
        highPrice: zod_1.z.string().nullable(),
        history: zod_1.z.array(PriceHistory.Point),
    });
    const liveDistribution = (value) => ({
        open: value.open_dollars,
        low: value.low_dollars,
        high: value.high_dollars,
        close: value.close_dollars,
    });
    const livePoint = (point) => ({
        endPeriod: new Date(point.end_period_ts * 1000).toISOString(),
        yesBid: liveDistribution(point.yes_bid),
        yesAsk: liveDistribution(point.yes_ask),
        price: {
            open: point.price.open_dollars ?? null,
            low: point.price.low_dollars ?? null,
            high: point.price.high_dollars ?? null,
            close: point.price.close_dollars ?? null,
        },
        volume: point.volume_fp,
        openInterest: point.open_interest_fp,
    });
    const historicalPoint = (point) => ({
        endPeriod: new Date(point.end_period_ts * 1000).toISOString(),
        yesBid: {
            open: point.yes_bid.open,
            low: point.yes_bid.low,
            high: point.yes_bid.high,
            close: point.yes_bid.close,
        },
        yesAsk: {
            open: point.yes_ask.open,
            low: point.yes_ask.low,
            high: point.yes_ask.high,
            close: point.yes_ask.close,
        },
        price: {
            open: point.price.open,
            low: point.price.low,
            high: point.price.high,
            close: point.price.close,
        },
        volume: point.volume,
        openInterest: point.open_interest,
    });
    /** Evenly samples a long series and always keeps its newest point. */
    const sample = (values, maximum) => {
        if (values.length <= maximum)
            return [...values];
        const stride = (values.length - 1) / (maximum - 1);
        const result = Array.from({ length: maximum }, (_, index) => values[Math.round(index * stride)]);
        result[maximum - 1] = values[values.length - 1];
        return result;
    };
    const build = (args) => {
        const prices = args.points
            .flatMap(point => point.price.close === null ? [] : [point.price.close]);
        const byPrice = [...prices].sort((left, right) => Number(left) - Number(right));
        return {
            ticker: args.ticker,
            source: args.source,
            intervalMinutes: args.interval,
            startTime: new Date(args.startTs * 1000).toISOString(),
            endTime: new Date(args.endTs * 1000).toISOString(),
            readings: args.points.length,
            firstPrice: prices[0] ?? null,
            lastPrice: prices.at(-1) ?? null,
            lowPrice: byPrice[0] ?? null,
            highPrice: byPrice.at(-1) ?? null,
            history: sample(args.points, Math.max(2, Math.trunc(args.maximum))),
        };
    };
    PriceHistory.fromLive = (args) => build({
        ...args,
        source: "live",
        points: args.candlesticks.map(livePoint),
        maximum: args.maximum ?? 120,
    });
    PriceHistory.fromHistorical = (args) => build({
        ...args,
        source: "historical",
        points: args.candlesticks.map(historicalPoint),
        maximum: args.maximum ?? 120,
    });
})(PriceHistory || (exports.PriceHistory = PriceHistory = {}));
