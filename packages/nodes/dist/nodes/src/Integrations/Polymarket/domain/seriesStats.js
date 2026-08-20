"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeriesStats = void 0;
const zod_1 = require("zod");
const Gamma_1 = require("./Gamma");
/**
 * How a series is trading. The counterpart to MarketStats and EventStats.
 *
 * Less trustworthy than either: `volume` is populated for some series and zero for others — FOMC
 * reports 114M and MLB 4.4M, while NFL, NBA, NHL, EPL and CPI all report 0 despite having live
 * events. A zero here means "not reported", not "no trading".
 */
var SeriesStats;
(function (SeriesStats) {
    SeriesStats.Schema = zod_1.z.object({
        seriesId: zod_1.z.string().nullable(),
        volume: zod_1.z.number().nullable(),
        volume24hr: zod_1.z.number().nullable(),
        liquidity: zod_1.z.number().nullable(),
        competitive: zod_1.z.number().nullable(),
        commentCount: zod_1.z.number().nullable(),
    });
    SeriesStats.fromGamma = (series) => ({
        seriesId: series.id ?? null,
        volume: series.volume ?? null,
        volume24hr: series.volume24hr ?? null,
        liquidity: series.liquidity ?? null,
        // Gamma sends this as the string "0" on a series and a number elsewhere.
        competitive: Gamma_1.Gamma.Common.LooseNumber.parse(series.competitive ?? null),
        commentCount: series.commentCount ?? null,
    });
})(SeriesStats || (exports.SeriesStats = SeriesStats = {}));
