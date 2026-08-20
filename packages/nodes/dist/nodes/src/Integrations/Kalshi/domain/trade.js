"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trade = void 0;
const zod_1 = require("zod");
var Trade;
(function (Trade) {
    Trade.Schema = zod_1.z.object({
        id: zod_1.z.string(),
        ticker: zod_1.z.string(),
        count: zod_1.z.string(),
        yesPrice: zod_1.z.string(),
        noPrice: zod_1.z.string(),
        takerOutcomeSide: zod_1.z.enum(["yes", "no"]),
        takerBookSide: zod_1.z.enum(["bid", "ask"]),
        createdTime: zod_1.z.string(),
        blockTrade: zod_1.z.boolean(),
        archived: zod_1.z.boolean(),
    });
    Trade.fromAPI = (trade, options = {}) => ({
        id: trade.trade_id,
        ticker: trade.ticker,
        count: trade.count_fp,
        yesPrice: trade.yes_price_dollars,
        noPrice: trade.no_price_dollars,
        takerOutcomeSide: trade.taker_outcome_side,
        takerBookSide: trade.taker_book_side,
        createdTime: trade.created_time,
        blockTrade: trade.is_block_trade,
        archived: options.archived ?? false,
    });
})(Trade || (exports.Trade = Trade = {}));
