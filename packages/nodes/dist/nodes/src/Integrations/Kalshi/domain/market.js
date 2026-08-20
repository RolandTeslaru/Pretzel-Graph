"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Market = void 0;
const zod_1 = require("zod");
/**
 * The market shape PretzelGraph exposes.
 *
 * Kalshi already owns the wire model through its generated TypeScript client. This is deliberately
 * not a second copy of that contract: it is the smaller, stable result a graph or agent needs,
 * expressed in PretzelGraph naming and without deprecated fields.
 */
var Market;
(function (Market) {
    Market.QueryStatus = zod_1.z.enum([
        "unopened",
        "open",
        "paused",
        "closed",
        "settled",
    ]);
    let Meta;
    (function (Meta) {
        Meta.Schema = zod_1.z.object({
            ticker: zod_1.z.string(),
            eventTicker: zod_1.z.string(),
            yesSubtitle: zod_1.z.string(),
            noSubtitle: zod_1.z.string(),
            status: zod_1.z.string(),
            result: zod_1.z.string(),
            yesBid: zod_1.z.string(),
            yesAsk: zod_1.z.string(),
            noBid: zod_1.z.string(),
            noAsk: zod_1.z.string(),
            lastPrice: zod_1.z.string(),
            volume: zod_1.z.string(),
            volume24h: zod_1.z.string(),
            openInterest: zod_1.z.string(),
            openTime: zod_1.z.string(),
            closeTime: zod_1.z.string(),
            /** True when this row came from Kalshi's historical partition. */
            archived: zod_1.z.boolean(),
        });
        Meta.fromAPI = (market, options = {}) => ({
            ticker: market.ticker,
            eventTicker: market.event_ticker,
            yesSubtitle: market.yes_sub_title,
            noSubtitle: market.no_sub_title,
            status: market.status,
            result: market.result,
            yesBid: market.yes_bid_dollars,
            yesAsk: market.yes_ask_dollars,
            noBid: market.no_bid_dollars,
            noAsk: market.no_ask_dollars,
            lastPrice: market.last_price_dollars,
            volume: market.volume_fp,
            volume24h: market.volume_24h_fp,
            openInterest: market.open_interest_fp,
            openTime: market.open_time,
            closeTime: market.close_time,
            archived: options.archived ?? false,
        });
    })(Meta = Market.Meta || (Market.Meta = {}));
    Market.Schema = Meta.Schema.extend({
        marketType: zod_1.z.string(),
        createdTime: zod_1.z.string(),
        updatedTime: zod_1.z.string(),
        expectedExpirationTime: zod_1.z.string().nullable(),
        latestExpirationTime: zod_1.z.string(),
        settlementTime: zod_1.z.string().nullable(),
        settlementTimerSeconds: zod_1.z.number(),
        settlementValue: zod_1.z.string().nullable(),
        expirationValue: zod_1.z.string(),
        canCloseEarly: zod_1.z.boolean(),
        earlyCloseCondition: zod_1.z.string().nullable(),
        rulesPrimary: zod_1.z.string(),
        rulesSecondary: zod_1.z.string(),
        notionalValue: zod_1.z.string(),
        priceLevelStructure: zod_1.z.string(),
        priceRanges: zod_1.z.array(zod_1.z.object({
            start: zod_1.z.string(),
            end: zod_1.z.string(),
            step: zod_1.z.string(),
        })),
        isProvisional: zod_1.z.boolean(),
        exchangeIndex: zod_1.z.number(),
    });
    Market.fromAPI = (market, options = {}) => ({
        ...Meta.fromAPI(market, options),
        marketType: market.market_type,
        createdTime: market.created_time,
        updatedTime: market.updated_time,
        expectedExpirationTime: market.expected_expiration_time ?? null,
        latestExpirationTime: market.latest_expiration_time,
        settlementTime: market.settlement_ts ?? null,
        settlementTimerSeconds: market.settlement_timer_seconds,
        settlementValue: market.settlement_value_dollars ?? null,
        expirationValue: market.expiration_value,
        canCloseEarly: market.can_close_early,
        earlyCloseCondition: market.early_close_condition ?? null,
        rulesPrimary: market.rules_primary,
        rulesSecondary: market.rules_secondary,
        notionalValue: market.notional_value_dollars,
        priceLevelStructure: market.price_level_structure,
        priceRanges: market.price_ranges.map(range => ({
            start: range.start,
            end: range.end,
            step: range.step,
        })),
        isProvisional: market.is_provisional ?? false,
        exchangeIndex: market.exchange_index ?? 0,
    });
})(Market || (exports.Market = Market = {}));
