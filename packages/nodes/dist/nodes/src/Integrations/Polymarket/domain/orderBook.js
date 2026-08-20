"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderBook = void 0;
const zod_1 = require("zod");
/**
 * The resting orders for one outcome token — the live exchange state, from the CLOB.
 *
 * Two things this fixes about the wire shape. The CLOB sorts both sides worst-first: `bids[0]` is
 * always 0.001 and `asks[0]` always 0.999, so reading the head of either array gives the least
 * useful order in the book, and an agent asked for the best price to buy would answer 0.999. And
 * prices and sizes arrive as strings.
 *
 * Levels are capped because the tail is resting orders at the extremes that will never fill — a
 * typical book is 60 bids and 160 asks, nearly all of it far from the money. `bidDepth`/`askDepth`
 * total every level, including the ones not shown, so "how much can I move" stays answerable.
 */
var OrderBook;
(function (OrderBook) {
    OrderBook.DEFAULT_DEPTH = 15;
    OrderBook.Level = zod_1.z.object({
        price: zod_1.z.number(),
        size: zod_1.z.number(),
    });
    OrderBook.Schema = zod_1.z.object({
        conditionId: zod_1.z.string().nullable(),
        tokenId: zod_1.z.string().nullable(),
        /** Best first. */
        bids: zod_1.z.array(OrderBook.Level),
        asks: zod_1.z.array(OrderBook.Level),
        /** The best prices, and the gap between them. Null when a side is empty. */
        bestBid: zod_1.z.number().nullable(),
        bestAsk: zod_1.z.number().nullable(),
        spread: zod_1.z.number().nullable(),
        /** Total size across every level, not only the ones returned. */
        bidDepth: zod_1.z.number(),
        askDepth: zod_1.z.number(),
        /** How many levels exist against how many are shown. */
        bidLevels: zod_1.z.number().int(),
        askLevels: zod_1.z.number().int(),
        lastTradePrice: zod_1.z.number().nullable(),
        tickSize: zod_1.z.number().nullable(),
        minOrderSize: zod_1.z.number().nullable(),
        negRisk: zod_1.z.boolean().nullable(),
    });
    const number = (value) => {
        if (value === null || value === undefined || value === "")
            return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };
    const levels = (raw) => (raw ?? [])
        .map(level => ({ price: number(level.price), size: number(level.size) }))
        .filter((level) => level.price !== null && level.size !== null);
    OrderBook.fromCLOB = (book, depth = OrderBook.DEFAULT_DEPTH) => {
        // Sorted rather than reversed: relying on the CLOB's ordering is what made reading the
        // head of the array wrong in the first place.
        const bids = levels(book.bids).sort((left, right) => right.price - left.price);
        const asks = levels(book.asks).sort((left, right) => left.price - right.price);
        const total = (side) => side.reduce((sum, level) => sum + level.size, 0);
        return {
            conditionId: book.market ?? null,
            tokenId: book.asset_id ?? null,
            bids: bids.slice(0, depth),
            asks: asks.slice(0, depth),
            bestBid: bids[0]?.price ?? null,
            bestAsk: asks[0]?.price ?? null,
            spread: bids[0] && asks[0] ? Number((asks[0].price - bids[0].price).toFixed(6)) : null,
            bidDepth: total(bids),
            askDepth: total(asks),
            bidLevels: bids.length,
            askLevels: asks.length,
            lastTradePrice: number(book.last_trade_price),
            tickSize: number(book.tick_size),
            minOrderSize: number(book.min_order_size),
            negRisk: book.neg_risk ?? null,
        };
    };
})(OrderBook || (exports.OrderBook = OrderBook = {}));
