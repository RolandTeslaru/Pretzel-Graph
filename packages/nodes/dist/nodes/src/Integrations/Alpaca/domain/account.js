"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Watchlist = exports.Portfolio = exports.Position = exports.Summary = void 0;
const zod_1 = require("zod");
const market_1 = require("./market");
const common_1 = require("./common");
var Summary;
(function (Summary) {
    Summary.Schema = zod_1.z.object({
        id: zod_1.z.string(),
        accountNumber: zod_1.z.string().nullable(),
        status: zod_1.z.string().nullable(),
        currency: zod_1.z.string().nullable(),
        cash: zod_1.z.string().nullable(),
        equity: zod_1.z.string().nullable(),
        buyingPower: zod_1.z.string().nullable(),
        nonMarginableBuyingPower: zod_1.z.string().nullable(),
        optionsBuyingPower: zod_1.z.string().nullable(),
        portfolioValue: zod_1.z.string().nullable(),
        longMarketValue: zod_1.z.string().nullable(),
        shortMarketValue: zod_1.z.string().nullable(),
        initialMargin: zod_1.z.string().nullable(),
        maintenanceMargin: zod_1.z.string().nullable(),
        multiplier: zod_1.z.string().nullable(),
        patternDayTrader: zod_1.z.boolean(),
        tradingBlocked: zod_1.z.boolean(),
        transfersBlocked: zod_1.z.boolean(),
        accountBlocked: zod_1.z.boolean(),
        optionsApprovedLevel: zod_1.z.number().nullable(),
        optionsTradingLevel: zod_1.z.number().nullable(),
        createdAt: zod_1.z.string().nullable(),
    });
    Summary.fromAPI = (value) => ({
        id: value.id,
        accountNumber: value.accountNumber ?? null,
        status: value.status ?? null,
        currency: value.currency ?? null,
        cash: value.cash ?? null,
        equity: value.equity ?? null,
        buyingPower: value.buyingPower ?? null,
        nonMarginableBuyingPower: value.nonMarginableBuyingPower ?? null,
        optionsBuyingPower: value.optionsBuyingPower ?? null,
        portfolioValue: value.portfolioValue ?? null,
        longMarketValue: value.longMarketValue ?? null,
        shortMarketValue: value.shortMarketValue ?? null,
        initialMargin: value.initialMargin ?? null,
        maintenanceMargin: value.maintenanceMargin ?? null,
        multiplier: value.multiplier ?? null,
        patternDayTrader: Boolean(value.patternDayTrader),
        tradingBlocked: value.tradingBlocked ?? false,
        transfersBlocked: value.transfersBlocked ?? false,
        accountBlocked: value.accountBlocked ?? false,
        optionsApprovedLevel: value.optionsApprovedLevel ?? null,
        optionsTradingLevel: value.optionsTradingLevel ?? null,
        createdAt: (0, common_1.iso)(value.createdAt),
    });
})(Summary || (exports.Summary = Summary = {}));
var Position;
(function (Position) {
    Position.Schema = zod_1.z.object({
        assetId: zod_1.z.string(),
        symbol: zod_1.z.string(),
        assetClass: zod_1.z.string(),
        exchange: zod_1.z.string(),
        side: zod_1.z.string(),
        quantity: zod_1.z.string(),
        availableQuantity: zod_1.z.string().nullable(),
        averageEntryPrice: zod_1.z.string(),
        currentPrice: zod_1.z.string(),
        marketValue: zod_1.z.string(),
        costBasis: zod_1.z.string(),
        unrealizedProfit: zod_1.z.string(),
        unrealizedProfitPct: zod_1.z.string(),
        intradayProfit: zod_1.z.string(),
        intradayProfitPct: zod_1.z.string(),
        changeToday: zod_1.z.string(),
    });
    Position.fromAPI = (value) => ({
        assetId: value.assetId,
        symbol: value.symbol,
        assetClass: value.assetClass,
        exchange: value.exchange,
        side: value.side,
        quantity: value.qty,
        availableQuantity: value.qtyAvailable ?? null,
        averageEntryPrice: value.avgEntryPrice,
        currentPrice: value.currentPrice,
        marketValue: value.marketValue,
        costBasis: value.costBasis,
        unrealizedProfit: value.unrealizedPl,
        unrealizedProfitPct: value.unrealizedPlpc,
        intradayProfit: value.unrealizedIntradayPl,
        intradayProfitPct: value.unrealizedIntradayPlpc,
        changeToday: value.changeToday,
    });
})(Position || (exports.Position = Position = {}));
var Portfolio;
(function (Portfolio) {
    Portfolio.Point = zod_1.z.object({
        timestamp: zod_1.z.string(),
        equity: zod_1.z.number().nullable(),
        profitLoss: zod_1.z.number().nullable(),
        profitLossPct: zod_1.z.number().nullable(),
    });
    Portfolio.Schema = zod_1.z.object({
        baseValue: zod_1.z.number(),
        baseValueAsOf: zod_1.z.string().nullable(),
        timeframe: zod_1.z.string(),
        points: zod_1.z.array(Portfolio.Point),
    });
    Portfolio.fromAPI = (value) => ({
        baseValue: value.baseValue,
        baseValueAsOf: (0, common_1.iso)(value.baseValueAsof),
        timeframe: value.timeframe,
        points: value.timestamp.map((timestamp, index) => ({
            timestamp: new Date(timestamp * 1000).toISOString(),
            equity: value.equity[index] ?? null,
            profitLoss: value.profitLoss[index] ?? null,
            profitLossPct: value.profitLossPct[index] ?? null,
        })),
    });
})(Portfolio || (exports.Portfolio = Portfolio = {}));
var Watchlist;
(function (Watchlist) {
    Watchlist.Schema = zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        createdAt: zod_1.z.string(),
        updatedAt: zod_1.z.string(),
        assets: zod_1.z.array(market_1.Asset.Schema),
    });
    Watchlist.fromAPI = (value) => ({
        id: value.id,
        name: value.name,
        createdAt: value.createdAt.toISOString(),
        updatedAt: value.updatedAt.toISOString(),
        assets: "assets" in value && value.assets
            ? value.assets.map(market_1.Asset.fromAPI)
            : [],
    });
})(Watchlist || (exports.Watchlist = Watchlist = {}));
