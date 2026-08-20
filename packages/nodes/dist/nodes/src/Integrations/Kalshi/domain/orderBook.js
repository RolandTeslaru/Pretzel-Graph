"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderBook = void 0;
const zod_1 = require("zod");
var OrderBook;
(function (OrderBook) {
    OrderBook.DEFAULT_DEPTH = 15;
    OrderBook.Level = zod_1.z.object({
        price: zod_1.z.string(),
        count: zod_1.z.string(),
    });
    OrderBook.Schema = zod_1.z.object({
        ticker: zod_1.z.string(),
        /** Kalshi transmits bids on both outcomes. The asks here are their exact complements. */
        yesBids: zod_1.z.array(OrderBook.Level),
        yesAsks: zod_1.z.array(OrderBook.Level),
        noBids: zod_1.z.array(OrderBook.Level),
        noAsks: zod_1.z.array(OrderBook.Level),
        bestYesBid: zod_1.z.string().nullable(),
        bestYesAsk: zod_1.z.string().nullable(),
        bestNoBid: zod_1.z.string().nullable(),
        bestNoAsk: zod_1.z.string().nullable(),
        yesSpread: zod_1.z.string().nullable(),
        noSpread: zod_1.z.string().nullable(),
        yesBidLevels: zod_1.z.number().int(),
        noBidLevels: zod_1.z.number().int(),
    });
    const SCALE = 1000000n;
    const units = (value) => {
        if (!/^\d+(?:\.\d{1,6})?$/.test(value))
            return null;
        const [whole, fraction = ""] = value.split(".");
        return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
    };
    const format = (value) => {
        const sign = value < 0n ? "-" : "";
        const absolute = value < 0n ? -value : value;
        const whole = absolute / SCALE;
        const fraction = (absolute % SCALE).toString().padStart(6, "0")
            .replace(/0+$/, "")
            .padEnd(4, "0");
        return `${sign}${whole}.${fraction}`;
    };
    const complement = (value) => {
        const parsed = units(value);
        return parsed === null || parsed < 0n || parsed > SCALE
            ? null
            : format(SCALE - parsed);
    };
    const spread = (bid, ask) => {
        if (bid === undefined || ask === undefined)
            return null;
        const bidUnits = units(bid);
        const askUnits = units(ask);
        return bidUnits === null || askUnits === null
            ? null
            : format(askUnits - bidUnits);
    };
    const levels = (raw) => raw.flatMap(level => {
        const [price, count] = level;
        return price && count && units(price) !== null
            ? [{ price, count }]
            : [];
    });
    const bids = (raw) => levels(raw).sort((left, right) => Number(right.price) - Number(left.price));
    const asks = (oppositeBids) => oppositeBids
        .flatMap(level => {
        const price = complement(level.price);
        return price === null ? [] : [{ price, count: level.count }];
    })
        .sort((left, right) => Number(left.price) - Number(right.price));
    OrderBook.fromAPI = (ticker, book, depth = OrderBook.DEFAULT_DEPTH) => {
        const yesBids = bids(book.yes_dollars);
        const noBids = bids(book.no_dollars);
        const yesAsks = asks(noBids);
        const noAsks = asks(yesBids);
        const cap = Math.max(1, Math.trunc(depth));
        return {
            ticker,
            yesBids: yesBids.slice(0, cap),
            yesAsks: yesAsks.slice(0, cap),
            noBids: noBids.slice(0, cap),
            noAsks: noAsks.slice(0, cap),
            bestYesBid: yesBids[0]?.price ?? null,
            bestYesAsk: yesAsks[0]?.price ?? null,
            bestNoBid: noBids[0]?.price ?? null,
            bestNoAsk: noAsks[0]?.price ?? null,
            yesSpread: spread(yesBids[0]?.price, yesAsks[0]?.price),
            noSpread: spread(noBids[0]?.price, noAsks[0]?.price),
            yesBidLevels: yesBids.length,
            noBidLevels: noBids.length,
        };
    };
})(OrderBook || (exports.OrderBook = OrderBook = {}));
