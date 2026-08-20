"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Screener = exports.CalendarDay = exports.MarketClock = exports.OptionSnapshot = exports.OptionContract = exports.NewsArticle = exports.Snapshot = exports.Quote = exports.Trade = exports.Bar = exports.Asset = void 0;
const rest_1 = require("@alpacahq/alpaca-trade-api/rest");
const zod_1 = require("zod");
const common_1 = require("./common");
var Asset;
(function (Asset) {
    Asset.Schema = zod_1.z.object({
        id: zod_1.z.string(),
        symbol: zod_1.z.string(),
        name: zod_1.z.string(),
        assetClass: zod_1.z.string(),
        exchange: zod_1.z.string(),
        status: zod_1.z.string(),
        tradable: zod_1.z.boolean(),
        fractionable: zod_1.z.boolean(),
        marginable: zod_1.z.boolean(),
        shortable: zod_1.z.boolean(),
        easyToBorrow: zod_1.z.boolean().nullable(),
    });
    Asset.fromAPI = (value) => ({
        id: value.id,
        symbol: value.symbol,
        name: value.name,
        assetClass: value._class,
        exchange: value.exchange,
        status: value.status,
        tradable: value.tradable,
        fractionable: value.fractionable,
        marginable: value.marginable,
        shortable: value.shortable,
        easyToBorrow: value.easyToBorrow ?? null,
    });
})(Asset || (exports.Asset = Asset = {}));
var Bar;
(function (Bar) {
    Bar.Schema = zod_1.z.object({
        symbol: zod_1.z.string().nullable(),
        timestamp: zod_1.z.string(),
        timestampRaw: zod_1.z.string().nullable(),
        open: zod_1.z.number(),
        high: zod_1.z.number(),
        low: zod_1.z.number(),
        close: zod_1.z.number(),
        volume: zod_1.z.number(),
        vwap: zod_1.z.number().nullable(),
        tradeCount: zod_1.z.number().nullable(),
    });
    Bar.fromSDK = (value) => ({
        symbol: value.symbol ?? null,
        timestamp: value.timestamp.toISOString(),
        timestampRaw: value.timestampRaw ?? null,
        open: value.open,
        high: value.high,
        low: value.low,
        close: value.close,
        volume: value.volume,
        vwap: value.vwap ?? null,
        tradeCount: value.tradeCount ?? null,
    });
})(Bar || (exports.Bar = Bar = {}));
var Trade;
(function (Trade) {
    Trade.Schema = zod_1.z.object({
        symbol: zod_1.z.string().nullable(),
        timestamp: zod_1.z.string(),
        timestampRaw: zod_1.z.string().nullable(),
        price: zod_1.z.number(),
        size: zod_1.z.number(),
        id: zod_1.z.number().nullable(),
        idRaw: zod_1.z.string().nullable(),
        exchange: zod_1.z.string().nullable(),
        conditions: zod_1.z.array(zod_1.z.string()),
        tape: zod_1.z.string().nullable(),
        takerSide: zod_1.z.string().nullable(),
        update: zod_1.z.string().nullable(),
    });
    Trade.fromSDK = (value) => ({
        symbol: value.symbol ?? null,
        timestamp: value.timestamp.toISOString(),
        timestampRaw: value.timestampRaw ?? null,
        price: value.price,
        size: value.size,
        id: value.id ?? null,
        idRaw: value.idRaw ?? null,
        exchange: value.exchange ?? null,
        conditions: value.conditions ?? [],
        tape: value.tape ?? null,
        takerSide: value.takerSide ?? null,
        update: value.update ?? null,
    });
})(Trade || (exports.Trade = Trade = {}));
var Quote;
(function (Quote) {
    Quote.Schema = zod_1.z.object({
        symbol: zod_1.z.string().nullable(),
        timestamp: zod_1.z.string(),
        timestampRaw: zod_1.z.string().nullable(),
        bidPrice: zod_1.z.number(),
        bidSize: zod_1.z.number(),
        bidExchange: zod_1.z.string().nullable(),
        askPrice: zod_1.z.number(),
        askSize: zod_1.z.number(),
        askExchange: zod_1.z.string().nullable(),
        conditions: zod_1.z.array(zod_1.z.string()),
        tape: zod_1.z.string().nullable(),
    });
    Quote.fromSDK = (value) => ({
        symbol: value.symbol ?? null,
        timestamp: value.timestamp.toISOString(),
        timestampRaw: value.timestampRaw ?? null,
        bidPrice: value.bidPrice,
        bidSize: value.bidSize,
        bidExchange: value.bidExchange ?? null,
        askPrice: value.askPrice,
        askSize: value.askSize,
        askExchange: value.askExchange ?? null,
        conditions: value.conditions ?? [],
        tape: value.tape ?? null,
    });
})(Quote || (exports.Quote = Quote = {}));
var Snapshot;
(function (Snapshot) {
    Snapshot.Schema = zod_1.z.object({
        symbol: zod_1.z.string(),
        assetClass: zod_1.z.enum(["stock", "crypto"]),
        latestTrade: Trade.Schema.nullable(),
        latestQuote: Quote.Schema.nullable(),
        minuteBar: Bar.Schema.nullable(),
        dailyBar: Bar.Schema.nullable(),
        previousDay: Bar.Schema.nullable(),
    });
    Snapshot.fromStock = (symbol, value) => ({
        symbol,
        assetClass: "stock",
        latestTrade: value.latestTrade
            ? Trade.fromSDK(rest_1.marketDataShapes.toStockTrade(value.latestTrade, symbol))
            : null,
        latestQuote: value.latestQuote
            ? Quote.fromSDK(rest_1.marketDataShapes.toStockQuote(value.latestQuote, symbol))
            : null,
        minuteBar: value.minuteBar
            ? Bar.fromSDK(rest_1.marketDataShapes.toBar(value.minuteBar, symbol))
            : null,
        dailyBar: value.dailyBar
            ? Bar.fromSDK(rest_1.marketDataShapes.toBar(value.dailyBar, symbol))
            : null,
        previousDay: value.prevDailyBar
            ? Bar.fromSDK(rest_1.marketDataShapes.toBar(value.prevDailyBar, symbol))
            : null,
    });
    Snapshot.fromCrypto = (symbol, value) => ({
        symbol,
        assetClass: "crypto",
        latestTrade: value.latestTrade
            ? Trade.fromSDK(rest_1.marketDataShapes.toCryptoTrade(value.latestTrade, symbol))
            : null,
        latestQuote: value.latestQuote
            ? Quote.fromSDK(rest_1.marketDataShapes.toCryptoQuote(value.latestQuote, symbol))
            : null,
        minuteBar: value.minuteBar
            ? Bar.fromSDK(rest_1.marketDataShapes.toBar(value.minuteBar, symbol))
            : null,
        dailyBar: value.dailyBar
            ? Bar.fromSDK(rest_1.marketDataShapes.toBar(value.dailyBar, symbol))
            : null,
        previousDay: value.prevDailyBar
            ? Bar.fromSDK(rest_1.marketDataShapes.toBar(value.prevDailyBar, symbol))
            : null,
    });
})(Snapshot || (exports.Snapshot = Snapshot = {}));
var NewsArticle;
(function (NewsArticle) {
    NewsArticle.Schema = zod_1.z.object({
        id: zod_1.z.number(),
        headline: zod_1.z.string(),
        summary: zod_1.z.string(),
        author: zod_1.z.string(),
        source: zod_1.z.string(),
        symbols: zod_1.z.array(zod_1.z.string()),
        url: zod_1.z.string().nullable(),
        createdAt: zod_1.z.string(),
        updatedAt: zod_1.z.string(),
    });
    NewsArticle.fromAPI = (value) => ({
        id: value.id,
        headline: value.headline,
        summary: value.summary,
        author: value.author,
        source: value.source,
        symbols: value.symbols,
        url: value.url ?? null,
        createdAt: value.createdAt.toISOString(),
        updatedAt: value.updatedAt.toISOString(),
    });
})(NewsArticle || (exports.NewsArticle = NewsArticle = {}));
var OptionContract;
(function (OptionContract) {
    OptionContract.Schema = zod_1.z.object({
        id: zod_1.z.string(),
        symbol: zod_1.z.string(),
        name: zod_1.z.string(),
        status: zod_1.z.string(),
        tradable: zod_1.z.boolean(),
        type: zod_1.z.string(),
        style: zod_1.z.string(),
        strikePrice: zod_1.z.string(),
        expirationDate: zod_1.z.string(),
        underlyingSymbol: zod_1.z.string(),
        multiplier: zod_1.z.string(),
        size: zod_1.z.string(),
        openInterest: zod_1.z.string().nullable(),
        closePrice: zod_1.z.string().nullable(),
    });
    OptionContract.fromAPI = (value) => ({
        id: value.id,
        symbol: value.symbol,
        name: value.name,
        status: value.status,
        tradable: value.tradable,
        type: value.type,
        style: value.style,
        strikePrice: value.strikePrice,
        expirationDate: value.expirationDate.toISOString(),
        underlyingSymbol: value.underlyingSymbol,
        multiplier: value.multiplier,
        size: value.size,
        openInterest: value.openInterest ?? null,
        closePrice: value.closePrice ?? null,
    });
})(OptionContract || (exports.OptionContract = OptionContract = {}));
var OptionSnapshot;
(function (OptionSnapshot) {
    OptionSnapshot.Schema = zod_1.z.object({
        symbol: zod_1.z.string(),
        impliedVolatility: zod_1.z.number().nullable(),
        greeks: zod_1.z.object({
            delta: zod_1.z.number(),
            gamma: zod_1.z.number(),
            rho: zod_1.z.number(),
            theta: zod_1.z.number(),
            vega: zod_1.z.number(),
        }).nullable(),
        latestTrade: Trade.Schema.nullable(),
        latestQuote: Quote.Schema.nullable(),
        minuteBar: Bar.Schema.nullable(),
        dailyBar: Bar.Schema.nullable(),
        previousDay: Bar.Schema.nullable(),
    });
    OptionSnapshot.fromAPI = (symbol, value) => ({
        symbol,
        impliedVolatility: value.impliedVolatility ?? null,
        greeks: value.greeks ?? null,
        latestTrade: value.latestTrade
            ? Trade.fromSDK(rest_1.marketDataShapes.toOptionTrade(value.latestTrade, symbol))
            : null,
        latestQuote: value.latestQuote
            ? Quote.fromSDK(rest_1.marketDataShapes.toOptionQuote(value.latestQuote, symbol))
            : null,
        minuteBar: value.minuteBar
            ? Bar.fromSDK(rest_1.marketDataShapes.toBar(value.minuteBar, symbol))
            : null,
        dailyBar: value.dailyBar
            ? Bar.fromSDK(rest_1.marketDataShapes.toBar(value.dailyBar, symbol))
            : null,
        previousDay: value.prevDailyBar
            ? Bar.fromSDK(rest_1.marketDataShapes.toBar(value.prevDailyBar, symbol))
            : null,
    });
})(OptionSnapshot || (exports.OptionSnapshot = OptionSnapshot = {}));
var MarketClock;
(function (MarketClock) {
    MarketClock.Schema = zod_1.z.object({
        timestamp: zod_1.z.string(),
        isOpen: zod_1.z.boolean(),
        nextOpen: zod_1.z.string(),
        nextClose: zod_1.z.string(),
    });
    MarketClock.fromAPI = (value) => ({
        timestamp: value.timestamp.toISOString(),
        isOpen: value.isOpen,
        nextOpen: value.nextOpen.toISOString(),
        nextClose: value.nextClose.toISOString(),
    });
})(MarketClock || (exports.MarketClock = MarketClock = {}));
var CalendarDay;
(function (CalendarDay) {
    CalendarDay.Schema = zod_1.z.object({
        date: zod_1.z.string(),
        open: zod_1.z.string(),
        close: zod_1.z.string(),
        sessionOpen: zod_1.z.string(),
        sessionClose: zod_1.z.string(),
        settlementDate: zod_1.z.string(),
    });
    CalendarDay.fromAPI = (value) => ({
        date: (0, common_1.iso)(value.date) ?? "",
        open: value.open,
        close: value.close,
        sessionOpen: value.sessionOpen,
        sessionClose: value.sessionClose,
        settlementDate: (0, common_1.iso)(value.settlementDate) ?? "",
    });
})(CalendarDay || (exports.CalendarDay = CalendarDay = {}));
var Screener;
(function (Screener) {
    Screener.Active = zod_1.z.object({
        symbol: zod_1.z.string(),
        volume: zod_1.z.number(),
        tradeCount: zod_1.z.number(),
    });
    Screener.Mover = zod_1.z.object({
        symbol: zod_1.z.string(),
        price: zod_1.z.number(),
        change: zod_1.z.number(),
        percentChange: zod_1.z.number(),
    });
    Screener.Movers = zod_1.z.object({
        marketType: zod_1.z.string(),
        lastUpdated: zod_1.z.string(),
        gainers: zod_1.z.array(Screener.Mover),
        losers: zod_1.z.array(Screener.Mover),
    });
})(Screener || (exports.Screener = Screener = {}));
