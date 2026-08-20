"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderBook = void 0;
const zod_1 = require("zod");
var OrderBook;
(function (OrderBook) {
    OrderBook.DEFAULT_DEPTH = 15;
    OrderBook.Level = zod_1.z.object({
        price: zod_1.z.string(),
        size: zod_1.z.string(),
        orders: zod_1.z.number().int().nonnegative(),
    });
    OrderBook.Schema = zod_1.z.object({
        coin: zod_1.z.string(),
        time: zod_1.z.number().int(),
        bids: zod_1.z.array(OrderBook.Level),
        asks: zod_1.z.array(OrderBook.Level),
        bestBid: zod_1.z.string().nullable(),
        bestAsk: zod_1.z.string().nullable(),
        spread: zod_1.z.number().nullable(),
        bidLevels: zod_1.z.number().int().nonnegative(),
        askLevels: zod_1.z.number().int().nonnegative(),
    });
    const levels = (values, descending) => values
        .map(level => ({ price: level.px, size: level.sz, orders: level.n }))
        .sort((left, right) => descending
        ? Number(right.price) - Number(left.price)
        : Number(left.price) - Number(right.price));
    OrderBook.fromAPI = (book, depth = OrderBook.DEFAULT_DEPTH) => {
        const bids = levels(book.levels[0], true);
        const asks = levels(book.levels[1], false);
        const bestBid = bids[0]?.price ?? null;
        const bestAsk = asks[0]?.price ?? null;
        const bid = Number(bestBid);
        const ask = Number(bestAsk);
        return {
            coin: book.coin,
            time: book.time,
            bids: bids.slice(0, Math.max(1, Math.trunc(depth))),
            asks: asks.slice(0, Math.max(1, Math.trunc(depth))),
            bestBid,
            bestAsk,
            spread: Number.isFinite(bid) && Number.isFinite(ask) ? ask - bid : null,
            bidLevels: bids.length,
            askLevels: asks.length,
        };
    };
})(OrderBook || (exports.OrderBook = OrderBook = {}));
