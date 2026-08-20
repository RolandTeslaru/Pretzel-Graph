"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaMarketService = void 0;
const rest_1 = require("@alpacahq/alpaca-trade-api/rest");
const domain_1 = require("../domain");
const common_1 = require("../domain/common");
const unit = (value) => ({
    minute: rest_1.TimeFrameUnit.Minute,
    hour: rest_1.TimeFrameUnit.Hour,
    day: rest_1.TimeFrameUnit.Day,
    week: rest_1.TimeFrameUnit.Week,
    month: rest_1.TimeFrameUnit.Month,
})[value];
const collect = async (source, maximum) => {
    const values = [];
    for await (const value of source) {
        values.push(value);
        if (values.length >= maximum)
            break;
    }
    return values;
};
class AlpacaMarketService {
    client;
    constructor(client) {
        this.client = client;
    }
    assets = {
        list: async (args) => {
            const maximum = (0, common_1.bounded)(args.limit, 20, 1_000);
            const query = args.query?.trim().toLowerCase();
            const values = await this.client.trading.assets.getV2Assets({
                status: args.status ?? "active",
                assetClass: args.assetClass,
                exchange: args.exchange?.trim() || undefined,
            });
            return values
                .filter(value => !query
                || value.symbol.toLowerCase().includes(query)
                || value.name.toLowerCase().includes(query))
                .slice(0, maximum)
                .map(domain_1.Alpaca.Market.Asset.fromAPI);
        },
        get: async (symbolOrId) => domain_1.Alpaca.Market.Asset.fromAPI(await this.client.trading.assets.getV2AssetsSymbolOrAssetId({
            symbolOrAssetId: (0, common_1.required)(symbolOrId, "symbolOrId"),
        })),
    };
    clock = async () => domain_1.Alpaca.Market.Clock.fromAPI(await this.client.trading.clock.legacyClock());
    calendar = async (args) => {
        const values = await this.client.trading.calendar.legacyCalendar({
            start: (0, common_1.optionalDate)(args.start, "start"),
            end: (0, common_1.optionalDate)(args.end, "end"),
        });
        return values
            .slice(0, (0, common_1.bounded)(args.limit, 30, 1_000))
            .map(domain_1.Alpaca.Market.CalendarDay.fromAPI);
    };
    bars = async (args) => {
        const symbol = (0, common_1.required)(args.symbol, "symbol").toUpperCase();
        const maximum = (0, common_1.bounded)(args.limit, 200, 5_000);
        const timeframe = (0, rest_1.timeFrame)(args.multiplier ?? 1, unit(args.unit));
        const common = {
            timeframe,
            start: (0, common_1.optionalDate)(args.start, "start"),
            end: (0, common_1.optionalDate)(args.end, "end"),
            limit: Math.min(maximum, 10_000),
        };
        if (args.assetClass === "stock")
            return (await this.client.marketData.getStockBarsFor(symbol, {
                ...common,
                feed: (args.feed ?? "iex"),
                adjustment: "raw",
            }, { maxPerSymbol: maximum })).map(domain_1.Alpaca.Market.Bar.fromSDK);
        if (args.assetClass === "crypto")
            return (await this.client.marketData.getCryptoBarsFor(symbol, {
                ...common,
                loc: rest_1.marketData.CryptoHistoricalLoc.Us,
            }, { maxPerSymbol: maximum })).map(domain_1.Alpaca.Market.Bar.fromSDK);
        return (await this.client.marketData.getOptionBarsFor(symbol, common, {
            maxPerSymbol: maximum,
        })).map(domain_1.Alpaca.Market.Bar.fromSDK);
    };
    trades = async (args) => {
        const symbol = (0, common_1.required)(args.symbol, "symbol").toUpperCase();
        const maximum = (0, common_1.bounded)(args.limit, 100, 1_000);
        const common = {
            start: (0, common_1.optionalDate)(args.start, "start"),
            end: (0, common_1.optionalDate)(args.end, "end"),
            limit: maximum,
        };
        if (args.assetClass === "stock")
            return (await this.client.marketData.getStockTradesFor(symbol, {
                ...common,
                feed: (args.feed ?? "iex"),
            }, { maxPerSymbol: maximum })).map(domain_1.Alpaca.Market.Trade.fromSDK);
        if (args.assetClass === "crypto")
            return (await this.client.marketData.getCryptoTradesFor(symbol, {
                ...common,
                loc: rest_1.marketData.CryptoHistoricalLoc.Us,
            }, { maxPerSymbol: maximum })).map(domain_1.Alpaca.Market.Trade.fromSDK);
        const values = await this.client.marketData.collectOptionTradesBySymbol({
            symbols: symbol,
            ...common,
        }, { maxPerSymbol: maximum });
        return (values[symbol] ?? [])
            .map(value => rest_1.marketDataShapes.toOptionTrade(value, symbol))
            .map(domain_1.Alpaca.Market.Trade.fromSDK);
    };
    quotes = async (args) => {
        const symbol = (0, common_1.required)(args.symbol, "symbol").toUpperCase();
        const maximum = (0, common_1.bounded)(args.limit, 100, 1_000);
        const common = {
            start: (0, common_1.optionalDate)(args.start, "start"),
            end: (0, common_1.optionalDate)(args.end, "end"),
            limit: maximum,
        };
        if (args.assetClass === "stock")
            return (await this.client.marketData.getStockQuotesFor(symbol, {
                ...common,
                feed: (args.feed ?? "iex"),
            }, { maxPerSymbol: maximum })).map(domain_1.Alpaca.Market.Quote.fromSDK);
        return (await this.client.marketData.getCryptoQuotesFor(symbol, {
            ...common,
            loc: rest_1.marketData.CryptoHistoricalLoc.Us,
        }, { maxPerSymbol: maximum })).map(domain_1.Alpaca.Market.Quote.fromSDK);
    };
    snapshot = async (args) => {
        const symbol = (0, common_1.required)(args.symbol, "symbol").toUpperCase();
        if (args.assetClass === "stock") {
            const values = await this.client.marketData.stocks.stockSnapshots({
                symbols: symbol,
                feed: (args.feed ?? "iex"),
            });
            const value = values[symbol];
            if (!value)
                throw new Error(`Alpaca: no stock snapshot returned for '${symbol}'.`);
            return domain_1.Alpaca.Market.Snapshot.fromStock(symbol, value);
        }
        const response = await this.client.marketData.crypto.cryptoSnapshots({
            symbols: symbol,
            loc: rest_1.marketData.CryptoLatestLoc.Us,
        });
        const value = response.snapshots[symbol];
        if (!value)
            throw new Error(`Alpaca: no crypto snapshot returned for '${symbol}'.`);
        return domain_1.Alpaca.Market.Snapshot.fromCrypto(symbol, value);
    };
    news = async (args) => {
        const maximum = (0, common_1.bounded)(args.limit, 10, 100);
        return (await collect(this.client.marketData.iterateNews({
            symbols: args.symbols?.map(value => value.trim().toUpperCase()).filter(Boolean),
            start: (0, common_1.optionalDate)(args.start, "start"),
            end: (0, common_1.optionalDate)(args.end, "end"),
            limit: Math.min(maximum, 50),
        }), maximum)).map(domain_1.Alpaca.Market.NewsArticle.fromAPI);
    };
    optionContracts = {
        list: async (args) => {
            const maximum = (0, common_1.bounded)(args.limit, 50, 1_000);
            const values = await collect(this.client.trading.iterateOptionsContracts({
                underlyingSymbols: args.underlyingSymbols
                    ?.map(value => value.trim().toUpperCase())
                    .filter(Boolean)
                    .join(",") || undefined,
                status: args.status,
                type: args.type,
                expirationDate: (0, common_1.optionalDate)(args.expirationDate, "expirationDate"),
                expirationDateGte: (0, common_1.optionalDate)(args.expirationFrom, "expirationFrom"),
                expirationDateLte: (0, common_1.optionalDate)(args.expirationTo, "expirationTo"),
                strikePriceGte: args.strikeFrom,
                strikePriceLte: args.strikeTo,
                limit: Math.min(maximum, 100),
            }), maximum);
            return values.map(domain_1.Alpaca.Market.OptionContract.fromAPI);
        },
        get: async (symbolOrId) => domain_1.Alpaca.Market.OptionContract.fromAPI(await this.client.trading.assets.getOptionContractSymbolOrId({
            symbolOrId: (0, common_1.required)(symbolOrId, "symbolOrId"),
        })),
    };
    optionChain = async (args) => {
        const maximum = (0, common_1.bounded)(args.limit, 50, 500);
        const values = await collect(this.client.marketData.iterateOptionChain({
            underlyingSymbol: (0, common_1.required)(args.underlyingSymbol, "underlyingSymbol").toUpperCase(),
            type: args.type,
            expirationDate: (0, common_1.optionalDate)(args.expirationDate, "expirationDate"),
            expirationDateGte: (0, common_1.optionalDate)(args.expirationFrom, "expirationFrom"),
            expirationDateLte: (0, common_1.optionalDate)(args.expirationTo, "expirationTo"),
            strikePriceGte: args.strikeFrom,
            strikePriceLte: args.strikeTo,
            limit: Math.min(maximum, 100),
        }), maximum);
        return values.map(({ symbol, value }) => domain_1.Alpaca.Market.OptionSnapshot.fromAPI(symbol, value));
    };
    mostActives = async (args) => {
        const response = await this.client.marketData.screener.mostActives({
            by: args.by ?? "volume",
            top: (0, common_1.bounded)(args.limit, 10, 100),
        });
        return {
            lastUpdated: response.lastUpdated,
            results: response.mostActives,
        };
    };
    movers = async (args) => {
        const response = await this.client.marketData.screener.movers({
            marketType: args.marketType ?? "stocks",
            top: (0, common_1.bounded)(args.limit, 10, 100),
        });
        return {
            marketType: response.marketType,
            lastUpdated: response.lastUpdated,
            gainers: response.gainers,
            losers: response.losers,
        };
    };
}
exports.AlpacaMarketService = AlpacaMarketService;
