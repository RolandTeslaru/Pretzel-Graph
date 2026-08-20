"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStats = void 0;
const zod_1 = require("zod");
/**
 * How an event is trading, aggregated across its markets. The counterpart to MarketStats.
 *
 * Gamma sums these itself — an event's `volume` is the total across all its markets, not a figure
 * the event earned on its own. Nothing here is computed by us.
 */
var EventStats;
(function (EventStats) {
    EventStats.Schema = zod_1.z.object({
        /** Carried so a stats object stands on its own once separated from its event. */
        eventId: zod_1.z.string().nullable(),
        volume: zod_1.z.number().nullable(),
        volume24hr: zod_1.z.number().nullable(),
        volume1wk: zod_1.z.number().nullable(),
        volume1mo: zod_1.z.number().nullable(),
        volume1yr: zod_1.z.number().nullable(),
        liquidity: zod_1.z.number().nullable(),
        /** Total value currently riding on the event. Markets have no equivalent. */
        openInterest: zod_1.z.number().nullable(),
        /** Polymarket's own contested-ness score. Undocumented, roughly 0-1. */
        competitive: zod_1.z.number().nullable(),
        commentCount: zod_1.z.number().nullable(),
    });
    EventStats.fromGamma = (event) => ({
        eventId: event.id ?? null,
        volume: event.volume ?? null,
        volume24hr: event.volume24hr ?? null,
        volume1wk: event.volume1wk ?? null,
        volume1mo: event.volume1mo ?? null,
        volume1yr: event.volume1yr ?? null,
        liquidity: event.liquidity ?? null,
        openInterest: event.openInterest ?? null,
        competitive: typeof event.competitive === "number" ? event.competitive : null,
        commentCount: event.commentCount ?? null,
    });
})(EventStats || (exports.EventStats = EventStats = {}));
