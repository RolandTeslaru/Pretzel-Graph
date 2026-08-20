"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Candle = void 0;
const zod_1 = require("zod");
const api_1 = require("./api");
var Candle;
(function (Candle) {
    Candle.Schema = zod_1.z.object({
        openTime: zod_1.z.number().int(),
        closeTime: zod_1.z.number().int(),
        coin: zod_1.z.string(),
        interval: api_1.HyperLiquidAPI.CandleInterval,
        open: zod_1.z.string(),
        close: zod_1.z.string(),
        high: zod_1.z.string(),
        low: zod_1.z.string(),
        volume: zod_1.z.string(),
        trades: zod_1.z.number().int().nonnegative(),
    });
    Candle.fromAPI = (candle) => ({
        openTime: candle.t,
        closeTime: candle.T,
        coin: candle.s,
        interval: candle.i,
        open: candle.o,
        close: candle.c,
        high: candle.h,
        low: candle.l,
        volume: candle.v,
        trades: candle.n,
    });
})(Candle || (exports.Candle = Candle = {}));
