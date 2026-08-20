"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketStats = void 0;
const zod_1 = require("zod");
/**
 * How a market is trading, as opposed to what it is.
 *
 * Split out from `Market` because the two get asked about separately: identity and tradeability
 * answer "which market is this", these answer "is it moving". Keeping them apart means a listing
 * of 128 candidate markets doesn't carry five price-change figures each.
 *
 * These are Gamma's own numbers renamed and normalised, not anything we computed. The live view of
 * the book is the CLOB's — `get_price`, `get_order_book` — and will disagree with this snapshot.
 */
var MarketStats;
(function (MarketStats) {
    MarketStats.Schema = zod_1.z.object({
        /** Carried so a stats object stands on its own once it's been separated from its market. */
        conditionId: zod_1.z.string().nullable(),
        /** The resolution contract — what has to happen for Yes to pay. 400-1300 characters, and
         *  byte-identical to its event's on 77% of markets, which is why it isn't on Market. */
        description: zod_1.z.string().nullable(),
        volume: zod_1.z.number().nullable(),
        volume24hr: zod_1.z.number().nullable(),
        volume1wk: zod_1.z.number().nullable(),
        volume1mo: zod_1.z.number().nullable(),
        volume1yr: zod_1.z.number().nullable(),
        liquidity: zod_1.z.number().nullable(),
        /** Gamma's snapshot of the book. The CLOB has the live one. */
        bestBid: zod_1.z.number().nullable(),
        bestAsk: zod_1.z.number().nullable(),
        spread: zod_1.z.number().nullable(),
        lastTradePrice: zod_1.z.number().nullable(),
        oneHourPriceChange: zod_1.z.number().nullable(),
        oneDayPriceChange: zod_1.z.number().nullable(),
        oneWeekPriceChange: zod_1.z.number().nullable(),
        oneMonthPriceChange: zod_1.z.number().nullable(),
        oneYearPriceChange: zod_1.z.number().nullable(),
        /** Polymarket's own contested-ness score. Undocumented, roughly 0-1. */
        competitive: zod_1.z.number().nullable(),
    });
    MarketStats.fromGamma = (market) => ({
        conditionId: market.conditionId ?? null,
        description: market.description ?? null,
        volume: market.volumeNum ?? market.volume ?? null,
        volume24hr: market.volume24hr ?? null,
        volume1wk: market.volume1wk ?? null,
        volume1mo: market.volume1mo ?? null,
        volume1yr: market.volume1yr ?? null,
        liquidity: market.liquidityNum ?? market.liquidity ?? null,
        bestBid: market.bestBid ?? null,
        bestAsk: market.bestAsk ?? null,
        spread: market.spread ?? null,
        lastTradePrice: market.lastTradePrice ?? null,
        oneHourPriceChange: market.oneHourPriceChange ?? null,
        oneDayPriceChange: market.oneDayPriceChange ?? null,
        oneWeekPriceChange: market.oneWeekPriceChange ?? null,
        oneMonthPriceChange: market.oneMonthPriceChange ?? null,
        oneYearPriceChange: market.oneYearPriceChange ?? null,
        competitive: market.competitive ?? null,
    });
})(MarketStats || (exports.MarketStats = MarketStats = {}));
