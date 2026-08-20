"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KalshiPublicSDK = exports.createKalshiPublicAPIs = void 0;
const kalshi_typescript_1 = require("kalshi-typescript");
const domain_1 = require("../domain");
const BASE_PATH = "https://external-api.kalshi.com/trade-api/v2";
const createKalshiPublicAPIs = (http) => {
    // Kalshi's generated client accepts an Axios instance. Keeping this single construction seam
    // preserves PretzelGraph's proxy, abort signal and HTTP error normalization without recreating
    // any of the generated endpoint clients.
    const client = http.create({ vendor: "Kalshi" });
    return {
        events: new kalshi_typescript_1.EventsApi(undefined, BASE_PATH, client.raw),
        exchange: new kalshi_typescript_1.ExchangeApi(undefined, BASE_PATH, client.raw),
        historical: new kalshi_typescript_1.HistoricalApi(undefined, BASE_PATH, client.raw),
        markets: new kalshi_typescript_1.MarketApi(undefined, BASE_PATH, client.raw),
    };
};
exports.createKalshiPublicAPIs = createKalshiPublicAPIs;
/**
 * Public Kalshi operations in PretzelGraph terms.
 *
 * This is intentionally a facade, not another API client. The official package owns paths,
 * serialization and wire types. This class owns only named arguments, live/historical behavior,
 * result compaction and relationships that require more than one endpoint.
 */
class KalshiPublicSDK {
    #apis;
    constructor(http, apis) {
        this.#apis = apis ?? (0, exports.createKalshiPublicAPIs)(http);
    }
    static #required = (value, name) => {
        const result = value.trim();
        if (!result)
            throw new Error(`Kalshi: '${name}' is required.`);
        return result;
    };
    static #limit = (value, fallback = 20) => Math.min(Math.max(Math.trunc(value ?? fallback), 1), 1_000);
    static #isNotFound = (error) => {
        const candidate = error;
        return candidate?.status === 404 || candidate?.response?.status === 404;
    };
    static #uniqueBy = (values, key) => {
        const seen = new Set();
        return values.filter(value => {
            const id = key(value);
            if (seen.has(id))
                return false;
            seen.add(id);
            return true;
        });
    };
    async #market(ticker) {
        const required = _a.#required(ticker, "ticker");
        try {
            const { data } = await this.#apis.markets.getMarket(required);
            return { market: data.market, archived: false };
        }
        catch (error) {
            if (!_a.#isNotFound(error))
                throw error;
            const { data } = await this.#apis.historical.getHistoricalMarket(required);
            return { market: data.market, archived: true };
        }
    }
    markets = {
        list: async (args) => {
            const limit = _a.#limit(args.limit);
            const { data: live } = await this.#apis.markets.getMarkets(limit, undefined, args.eventTicker?.trim() || undefined, args.seriesTicker?.trim() || undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, args.status);
            const markets = live.markets.map(market => domain_1.Kalshi.Market.Meta.fromAPI(market));
            // Settled markets age out of the live collection as one unit. Querying both partitions
            // is the only way "settled" keeps meaning settled rather than recently settled.
            if (args.status !== "settled")
                return markets;
            const { data: historical } = await this.#apis.historical.getHistoricalMarkets(limit, undefined, undefined, args.eventTicker?.trim() || undefined, args.seriesTicker?.trim() || undefined);
            return _a
                .#uniqueBy([
                ...markets,
                ...historical.markets.map(market => domain_1.Kalshi.Market.Meta.fromAPI(market, { archived: true })),
            ], market => market.ticker)
                .slice(0, limit);
        },
        get: async (ticker) => {
            const found = await this.#market(ticker);
            return domain_1.Kalshi.Market.fromAPI(found.market, { archived: found.archived });
        },
    };
    events = {
        list: async (args = {}) => {
            const status = args.status === "all" ? undefined : args.status;
            const { data } = await this.#apis.events.getEvents(_a.#limit(args.limit), undefined, args.includeMarkets ?? false, false, status, args.seriesTicker?.trim() || undefined);
            return args.includeMarkets
                ? data.events.map(domain_1.Kalshi.Event.fromAPI)
                : data.events.map(domain_1.Kalshi.Event.Meta.fromAPI);
        },
        get: async (ticker, options = {}) => {
            const { data } = await this.#apis.events.getEvent(_a.#required(ticker, "ticker"), options.includeMarkets ?? true);
            return domain_1.Kalshi.Event.fromAPI(data.event);
        },
    };
    series = {
        list: async (args = {}) => {
            const { data } = await this.#apis.markets.getSeriesList(args.category?.trim() || undefined, args.tags?.map(tag => tag.trim()).filter(Boolean).join(",") || undefined, false, args.includeVolume ?? true);
            return data.series
                .slice(0, _a.#limit(args.limit))
                .map(domain_1.Kalshi.Series.Meta.fromAPI);
        },
        get: async (ticker) => {
            const { data } = await this.#apis.markets.getSeries(_a.#required(ticker, "ticker"), true);
            return domain_1.Kalshi.Series.fromAPI(data.series);
        },
    };
    trades = {
        list: async (args = {}) => {
            const limit = _a.#limit(args.limit, 100);
            const ticker = args.ticker?.trim() || undefined;
            const { data: live } = await this.#apis.markets.getTrades(limit, undefined, ticker, undefined, undefined, args.blockTradesOnly || undefined);
            const trades = live.trades.map(trade => domain_1.Kalshi.Trade.fromAPI(trade));
            if (!args.includeHistorical)
                return trades;
            const { data: historical } = await this.#apis.historical.getTradesHistorical(ticker, undefined, undefined, limit, undefined, args.blockTradesOnly || undefined);
            return _a
                .#uniqueBy([
                ...trades,
                ...historical.trades.map(trade => domain_1.Kalshi.Trade.fromAPI(trade, { archived: true })),
            ], trade => trade.id)
                .sort((left, right) => right.createdTime.localeCompare(left.createdTime))
                .slice(0, limit);
        },
    };
    prices = {
        orderBook: async (args) => {
            const ticker = _a.#required(args.ticker, "ticker");
            const depth = Math.min(Math.max(Math.trunc(args.depth ?? domain_1.Kalshi.OrderBook.DEFAULT_DEPTH), 1), 100);
            const { data } = await this.#apis.markets.getMarketOrderbook(ticker, depth);
            return domain_1.Kalshi.OrderBook.fromAPI(ticker, data.orderbook_fp, depth);
        },
        history: async (args) => {
            const ticker = _a.#required(args.ticker, "ticker");
            const found = await this.#market(ticker);
            const endTs = Math.floor(Date.now() / 1_000);
            const seconds = {
                "1d": 86_400,
                "7d": 7 * 86_400,
                "30d": 30 * 86_400,
                "90d": 90 * 86_400,
                "1y": 365 * 86_400,
            };
            const opened = Math.floor(new Date(found.market.open_time).getTime() / 1_000);
            const earliest = Number.isFinite(opened)
                ? Math.min(opened, endTs - args.interval * 60)
                : endTs - seconds["1y"];
            const startTs = args.window === "max"
                ? earliest
                : endTs - seconds[args.window];
            const maximum = Math.min(Math.max(Math.trunc(args.points ?? 120), 2), 500);
            if (found.archived) {
                const { data } = await this.#apis.historical.getMarketCandlesticksHistorical(ticker, startTs, endTs, args.interval);
                return domain_1.Kalshi.PriceHistory.fromHistorical({
                    ticker,
                    interval: args.interval,
                    startTs,
                    endTs,
                    candlesticks: data.candlesticks,
                    maximum,
                });
            }
            const { data: event } = await this.#apis.events.getEvent(found.market.event_ticker, false);
            const { data } = await this.#apis.markets.getMarketCandlesticks(event.event.series_ticker, ticker, startTs, endTs, args.interval, true);
            return domain_1.Kalshi.PriceHistory.fromLive({
                ticker,
                interval: args.interval,
                startTs,
                endTs,
                candlesticks: data.candlesticks,
                maximum,
            });
        },
    };
    exchange = {
        status: async () => {
            const { data } = await this.#apis.exchange.getExchangeStatus();
            return domain_1.Kalshi.Exchange.fromAPI(data);
        },
    };
}
exports.KalshiPublicSDK = KalshiPublicSDK;
_a = KalshiPublicSDK;
