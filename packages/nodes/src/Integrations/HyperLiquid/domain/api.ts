import { z } from "zod";


const Decimal = z.string();
const OptionalDecimal = Decimal.nullable().optional();


/** Hyperliquid's wire contract for the public `/info` endpoint. */
export namespace HyperLiquidAPI {

    export const Address = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

    export const CandleInterval = z.enum([
        "1m", "3m", "5m", "15m", "30m",
        "1h", "2h", "4h", "8h", "12h",
        "1d", "3d", "1w", "1M",
    ]);
    export type CandleInterval = z.infer<typeof CandleInterval>;


    export const Candle = z.object({
        t: z.number().int(),
        T: z.number().int(),
        s: z.string(),
        i: CandleInterval,
        o: Decimal,
        c: Decimal,
        h: Decimal,
        l: Decimal,
        v: Decimal,
        n: z.number().int().nonnegative(),
    }).passthrough();

    export const CandleSnapshot = z.array(Candle);


    export const BookLevel = z.object({
        px: Decimal,
        sz: Decimal,
        n:  z.number().int().nonnegative(),
    }).passthrough();

    export const OrderBook = z.object({
        coin:   z.string(),
        time:   z.number().int(),
        levels: z.tuple([z.array(BookLevel), z.array(BookLevel)]),
    }).passthrough();

    export const AllMids = z.record(z.string(), Decimal);


    export const PerpetualAsset = z.object({
        name:          z.string(),
        szDecimals:    z.number().int().nonnegative(),
        maxLeverage:   z.number().int().positive(),
        onlyIsolated:  z.boolean().optional(),
        marginTableId: z.number().int().optional(),
        isDelisted:    z.boolean().optional(),
    }).passthrough();

    export const AssetContext = z.object({
        dayNtlVlm:  OptionalDecimal,
        dayBaseVlm: OptionalDecimal,
        funding:    OptionalDecimal,
        impactPxs:  z.array(Decimal).nullable().optional(),
        markPx:     OptionalDecimal,
        midPx:      OptionalDecimal,
        openInterest: OptionalDecimal,
        oraclePx:     OptionalDecimal,
        premium:      OptionalDecimal,
        prevDayPx:    OptionalDecimal,
    }).passthrough();

    export const PerpetualMeta = z.object({
        universe: z.array(PerpetualAsset),
    }).passthrough();

    export const PerpetualMetaAndAssetContexts = z.tuple([
        PerpetualMeta,
        z.array(AssetContext),
    ]);


    export const SpotToken = z.object({
        name:        z.string(),
        szDecimals:  z.number().int().nonnegative(),
        weiDecimals: z.number().int().nonnegative(),
        index:       z.number().int().nonnegative(),
        tokenId:     z.string(),
        isCanonical: z.boolean(),
        fullName:    z.string().nullable().optional(),
        evmContract: z.unknown().nullable().optional(),
    }).passthrough();

    export const SpotPair = z.object({
        name:        z.string(),
        tokens:      z.tuple([z.number().int(), z.number().int()]),
        index:       z.number().int().nonnegative(),
        isCanonical: z.boolean(),
    }).passthrough();

    export const SpotAssetContext = AssetContext.extend({
        coin:              z.string(),
        circulatingSupply: OptionalDecimal,
        totalSupply:       OptionalDecimal,
    }).passthrough();

    export const SpotMeta = z.object({
        tokens:   z.array(SpotToken),
        universe: z.array(SpotPair),
    }).passthrough();

    export const SpotMetaAndAssetContexts = z.tuple([
        SpotMeta,
        z.array(SpotAssetContext),
    ]);


    export const MarginSummary = z.object({
        accountValue:    Decimal,
        totalMarginUsed: Decimal,
        totalNtlPos:     Decimal,
        totalRawUsd:     Decimal,
    }).passthrough();

    export const Position = z.object({
        coin:            z.string(),
        entryPx:         OptionalDecimal,
        liquidationPx:   OptionalDecimal,
        marginUsed:      Decimal,
        maxLeverage:     z.number().int().optional(),
        positionValue:   Decimal,
        returnOnEquity:  Decimal,
        szi:             Decimal,
        unrealizedPnl:   Decimal,
        leverage: z.object({
            type:   z.string(),
            value:  z.number(),
            rawUsd: Decimal.optional(),
        }).passthrough(),
    }).passthrough();

    export const AssetPosition = z.object({
        type:     z.string(),
        position: Position,
    }).passthrough();

    export const ClearinghouseState = z.object({
        marginSummary:             MarginSummary,
        crossMarginSummary:        MarginSummary,
        crossMaintenanceMarginUsed: Decimal.optional(),
        withdrawable:              Decimal,
        assetPositions:            z.array(AssetPosition),
        time:                      z.number().int().optional(),
    }).passthrough();


    export const SpotBalance = z.object({
        coin:     z.string(),
        token:    z.number().int(),
        total:    Decimal,
        hold:     Decimal,
        entryNtl: Decimal,
    }).passthrough();

    export const SpotClearinghouseState = z.object({
        balances: z.array(SpotBalance),
    }).passthrough();


    export const OpenOrder = z.object({
        coin:      z.string(),
        limitPx:   Decimal,
        oid:       z.number().int(),
        side:      z.string(),
        sz:        Decimal,
        timestamp: z.number().int(),
    }).passthrough();

    export const OpenOrders = z.array(OpenOrder);


    export const Fill = z.object({
        coin:          z.string(),
        px:            Decimal,
        sz:            Decimal,
        side:          z.string(),
        time:          z.number().int(),
        hash:          z.string(),
        oid:           z.number().int(),
        crossed:       z.boolean(),
        dir:           z.string(),
        closedPnl:     Decimal,
        startPosition: Decimal,
        fee:           Decimal.optional(),
        feeToken:      z.string().optional(),
        tid:           z.number().int().optional(),
    }).passthrough();

    export const Fills = z.array(Fill);


    export const FundingPayment = z.object({
        time: z.number().int(),
        hash: z.string(),
        delta: z.object({
            type:        z.string(),
            coin:        z.string(),
            usdc:        Decimal,
            szi:         Decimal,
            fundingRate: Decimal,
        }).passthrough(),
    }).passthrough();

    export const FundingPayments = z.array(FundingPayment);
}
