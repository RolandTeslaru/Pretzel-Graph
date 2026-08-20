"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperLiquidAPI = void 0;
const zod_1 = require("zod");
const Decimal = zod_1.z.string();
const OptionalDecimal = Decimal.nullable().optional();
/** Hyperliquid's wire contract for the public `/info` endpoint. */
var HyperLiquidAPI;
(function (HyperLiquidAPI) {
    HyperLiquidAPI.Address = zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/);
    HyperLiquidAPI.CandleInterval = zod_1.z.enum([
        "1m", "3m", "5m", "15m", "30m",
        "1h", "2h", "4h", "8h", "12h",
        "1d", "3d", "1w", "1M",
    ]);
    HyperLiquidAPI.Candle = zod_1.z.object({
        t: zod_1.z.number().int(),
        T: zod_1.z.number().int(),
        s: zod_1.z.string(),
        i: HyperLiquidAPI.CandleInterval,
        o: Decimal,
        c: Decimal,
        h: Decimal,
        l: Decimal,
        v: Decimal,
        n: zod_1.z.number().int().nonnegative(),
    }).passthrough();
    HyperLiquidAPI.CandleSnapshot = zod_1.z.array(HyperLiquidAPI.Candle);
    HyperLiquidAPI.BookLevel = zod_1.z.object({
        px: Decimal,
        sz: Decimal,
        n: zod_1.z.number().int().nonnegative(),
    }).passthrough();
    HyperLiquidAPI.OrderBook = zod_1.z.object({
        coin: zod_1.z.string(),
        time: zod_1.z.number().int(),
        levels: zod_1.z.tuple([zod_1.z.array(HyperLiquidAPI.BookLevel), zod_1.z.array(HyperLiquidAPI.BookLevel)]),
    }).passthrough();
    HyperLiquidAPI.AllMids = zod_1.z.record(zod_1.z.string(), Decimal);
    HyperLiquidAPI.PerpetualAsset = zod_1.z.object({
        name: zod_1.z.string(),
        szDecimals: zod_1.z.number().int().nonnegative(),
        maxLeverage: zod_1.z.number().int().positive(),
        onlyIsolated: zod_1.z.boolean().optional(),
        marginTableId: zod_1.z.number().int().optional(),
        isDelisted: zod_1.z.boolean().optional(),
    }).passthrough();
    HyperLiquidAPI.AssetContext = zod_1.z.object({
        dayNtlVlm: OptionalDecimal,
        dayBaseVlm: OptionalDecimal,
        funding: OptionalDecimal,
        impactPxs: zod_1.z.array(Decimal).nullable().optional(),
        markPx: OptionalDecimal,
        midPx: OptionalDecimal,
        openInterest: OptionalDecimal,
        oraclePx: OptionalDecimal,
        premium: OptionalDecimal,
        prevDayPx: OptionalDecimal,
    }).passthrough();
    HyperLiquidAPI.PerpetualMeta = zod_1.z.object({
        universe: zod_1.z.array(HyperLiquidAPI.PerpetualAsset),
    }).passthrough();
    HyperLiquidAPI.PerpetualMetaAndAssetContexts = zod_1.z.tuple([
        HyperLiquidAPI.PerpetualMeta,
        zod_1.z.array(HyperLiquidAPI.AssetContext),
    ]);
    HyperLiquidAPI.SpotToken = zod_1.z.object({
        name: zod_1.z.string(),
        szDecimals: zod_1.z.number().int().nonnegative(),
        weiDecimals: zod_1.z.number().int().nonnegative(),
        index: zod_1.z.number().int().nonnegative(),
        tokenId: zod_1.z.string(),
        isCanonical: zod_1.z.boolean(),
        fullName: zod_1.z.string().nullable().optional(),
        evmContract: zod_1.z.unknown().nullable().optional(),
    }).passthrough();
    HyperLiquidAPI.SpotPair = zod_1.z.object({
        name: zod_1.z.string(),
        tokens: zod_1.z.tuple([zod_1.z.number().int(), zod_1.z.number().int()]),
        index: zod_1.z.number().int().nonnegative(),
        isCanonical: zod_1.z.boolean(),
    }).passthrough();
    HyperLiquidAPI.SpotAssetContext = HyperLiquidAPI.AssetContext.extend({
        coin: zod_1.z.string(),
        circulatingSupply: OptionalDecimal,
        totalSupply: OptionalDecimal,
    }).passthrough();
    HyperLiquidAPI.SpotMeta = zod_1.z.object({
        tokens: zod_1.z.array(HyperLiquidAPI.SpotToken),
        universe: zod_1.z.array(HyperLiquidAPI.SpotPair),
    }).passthrough();
    HyperLiquidAPI.SpotMetaAndAssetContexts = zod_1.z.tuple([
        HyperLiquidAPI.SpotMeta,
        zod_1.z.array(HyperLiquidAPI.SpotAssetContext),
    ]);
    HyperLiquidAPI.MarginSummary = zod_1.z.object({
        accountValue: Decimal,
        totalMarginUsed: Decimal,
        totalNtlPos: Decimal,
        totalRawUsd: Decimal,
    }).passthrough();
    HyperLiquidAPI.Position = zod_1.z.object({
        coin: zod_1.z.string(),
        entryPx: OptionalDecimal,
        liquidationPx: OptionalDecimal,
        marginUsed: Decimal,
        maxLeverage: zod_1.z.number().int().optional(),
        positionValue: Decimal,
        returnOnEquity: Decimal,
        szi: Decimal,
        unrealizedPnl: Decimal,
        leverage: zod_1.z.object({
            type: zod_1.z.string(),
            value: zod_1.z.number(),
            rawUsd: Decimal.optional(),
        }).passthrough(),
    }).passthrough();
    HyperLiquidAPI.AssetPosition = zod_1.z.object({
        type: zod_1.z.string(),
        position: HyperLiquidAPI.Position,
    }).passthrough();
    HyperLiquidAPI.ClearinghouseState = zod_1.z.object({
        marginSummary: HyperLiquidAPI.MarginSummary,
        crossMarginSummary: HyperLiquidAPI.MarginSummary,
        crossMaintenanceMarginUsed: Decimal.optional(),
        withdrawable: Decimal,
        assetPositions: zod_1.z.array(HyperLiquidAPI.AssetPosition),
        time: zod_1.z.number().int().optional(),
    }).passthrough();
    HyperLiquidAPI.SpotBalance = zod_1.z.object({
        coin: zod_1.z.string(),
        token: zod_1.z.number().int(),
        total: Decimal,
        hold: Decimal,
        entryNtl: Decimal,
    }).passthrough();
    HyperLiquidAPI.SpotClearinghouseState = zod_1.z.object({
        balances: zod_1.z.array(HyperLiquidAPI.SpotBalance),
    }).passthrough();
    HyperLiquidAPI.OpenOrder = zod_1.z.object({
        coin: zod_1.z.string(),
        limitPx: Decimal,
        oid: zod_1.z.number().int(),
        side: zod_1.z.string(),
        sz: Decimal,
        timestamp: zod_1.z.number().int(),
    }).passthrough();
    HyperLiquidAPI.OpenOrders = zod_1.z.array(HyperLiquidAPI.OpenOrder);
    HyperLiquidAPI.Fill = zod_1.z.object({
        coin: zod_1.z.string(),
        px: Decimal,
        sz: Decimal,
        side: zod_1.z.string(),
        time: zod_1.z.number().int(),
        hash: zod_1.z.string(),
        oid: zod_1.z.number().int(),
        crossed: zod_1.z.boolean(),
        dir: zod_1.z.string(),
        closedPnl: Decimal,
        startPosition: Decimal,
        fee: Decimal.optional(),
        feeToken: zod_1.z.string().optional(),
        tid: zod_1.z.number().int().optional(),
    }).passthrough();
    HyperLiquidAPI.Fills = zod_1.z.array(HyperLiquidAPI.Fill);
    HyperLiquidAPI.FundingPayment = zod_1.z.object({
        time: zod_1.z.number().int(),
        hash: zod_1.z.string(),
        delta: zod_1.z.object({
            type: zod_1.z.string(),
            coin: zod_1.z.string(),
            usdc: Decimal,
            szi: Decimal,
            fundingRate: Decimal,
        }).passthrough(),
    }).passthrough();
    HyperLiquidAPI.FundingPayments = zod_1.z.array(HyperLiquidAPI.FundingPayment);
})(HyperLiquidAPI || (exports.HyperLiquidAPI = HyperLiquidAPI = {}));
