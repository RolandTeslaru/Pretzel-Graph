"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const zod_1 = require("zod");
const market_1 = require("./market");
var Event;
(function (Event) {
    Event.QueryStatus = zod_1.z.enum([
        "unopened",
        "open",
        "closed",
        "settled",
        "all",
    ]);
    let Meta;
    (function (Meta) {
        Meta.Schema = zod_1.z.object({
            ticker: zod_1.z.string(),
            seriesTicker: zod_1.z.string(),
            title: zod_1.z.string(),
            subtitle: zod_1.z.string(),
            collateralReturnType: zod_1.z.string(),
            mutuallyExclusive: zod_1.z.boolean(),
            availableOnBrokers: zod_1.z.boolean(),
            marketCount: zod_1.z.number().int(),
        });
        Meta.fromAPI = (event) => ({
            ticker: event.event_ticker,
            seriesTicker: event.series_ticker,
            title: event.title,
            subtitle: event.sub_title,
            collateralReturnType: event.collateral_return_type,
            mutuallyExclusive: event.mutually_exclusive,
            availableOnBrokers: event.available_on_brokers,
            marketCount: event.markets?.length ?? 0,
        });
    })(Meta = Event.Meta || (Event.Meta = {}));
    Event.Schema = Meta.Schema.extend({
        strikeDate: zod_1.z.string().nullable(),
        strikePeriod: zod_1.z.string().nullable(),
        settlementSources: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().nullable(),
            url: zod_1.z.string().nullable(),
        })),
        markets: zod_1.z.array(market_1.Market.Meta.Schema),
    });
    Event.fromAPI = (event) => ({
        ...Meta.fromAPI(event),
        strikeDate: event.strike_date ?? null,
        strikePeriod: event.strike_period ?? null,
        settlementSources: (event.settlement_sources ?? []).map(source => ({
            name: source.name ?? null,
            url: source.url ?? null,
        })),
        markets: (event.markets ?? []).map(market => market_1.Market.Meta.fromAPI(market)),
    });
})(Event || (exports.Event = Event = {}));
