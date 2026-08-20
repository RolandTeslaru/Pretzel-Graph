"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mid = exports.Market = void 0;
const zod_1 = require("zod");
const MarketContext = {
    markPrice: zod_1.z.string().nullable(),
    midPrice: zod_1.z.string().nullable(),
    previousDayPrice: zod_1.z.string().nullable(),
    dayNotionalVolume: zod_1.z.string().nullable(),
    dayBaseVolume: zod_1.z.string().nullable(),
};
var Market;
(function (Market) {
    Market.Perpetual = zod_1.z.object({
        kind: zod_1.z.literal("perpetual"),
        coin: zod_1.z.string(),
        dex: zod_1.z.string(),
        sizeDecimals: zod_1.z.number().int().nonnegative(),
        maxLeverage: zod_1.z.number().int().positive(),
        onlyIsolated: zod_1.z.boolean(),
        marginTableId: zod_1.z.number().int().nullable(),
        delisted: zod_1.z.boolean(),
        ...MarketContext,
        oraclePrice: zod_1.z.string().nullable(),
        funding: zod_1.z.string().nullable(),
        premium: zod_1.z.string().nullable(),
        openInterest: zod_1.z.string().nullable(),
    });
    Market.Spot = zod_1.z.object({
        kind: zod_1.z.literal("spot"),
        coin: zod_1.z.string(),
        index: zod_1.z.number().int().nonnegative(),
        baseToken: zod_1.z.string().nullable(),
        quoteToken: zod_1.z.string().nullable(),
        canonical: zod_1.z.boolean(),
        ...MarketContext,
        circulatingSupply: zod_1.z.string().nullable(),
        totalSupply: zod_1.z.string().nullable(),
    });
    Market.Schema = zod_1.z.discriminatedUnion("kind", [Market.Perpetual, Market.Spot]);
    Market.perpetualsFromAPI = (dex, response) => {
        const [meta, contexts] = response;
        return meta.universe.map((asset, index) => {
            const context = contexts[index];
            return {
                kind: "perpetual",
                coin: asset.name,
                dex,
                sizeDecimals: asset.szDecimals,
                maxLeverage: asset.maxLeverage,
                onlyIsolated: asset.onlyIsolated ?? false,
                marginTableId: asset.marginTableId ?? null,
                delisted: asset.isDelisted ?? false,
                markPrice: context?.markPx ?? null,
                midPrice: context?.midPx ?? null,
                oraclePrice: context?.oraclePx ?? null,
                previousDayPrice: context?.prevDayPx ?? null,
                dayNotionalVolume: context?.dayNtlVlm ?? null,
                dayBaseVolume: context?.dayBaseVlm ?? null,
                funding: context?.funding ?? null,
                premium: context?.premium ?? null,
                openInterest: context?.openInterest ?? null,
            };
        });
    };
    Market.spotsFromAPI = (response) => {
        const [meta, contexts] = response;
        const tokens = new Map(meta.tokens.map(token => [token.index, token]));
        const contextsByCoin = new Map(contexts.map(context => [context.coin, context]));
        return meta.universe.map(pair => {
            const context = contextsByCoin.get(pair.name);
            return {
                kind: "spot",
                coin: pair.name,
                index: pair.index,
                baseToken: tokens.get(pair.tokens[0])?.name ?? null,
                quoteToken: tokens.get(pair.tokens[1])?.name ?? null,
                canonical: pair.isCanonical,
                markPrice: context?.markPx ?? null,
                midPrice: context?.midPx ?? null,
                previousDayPrice: context?.prevDayPx ?? null,
                dayNotionalVolume: context?.dayNtlVlm ?? null,
                dayBaseVolume: context?.dayBaseVlm ?? null,
                circulatingSupply: context?.circulatingSupply ?? null,
                totalSupply: context?.totalSupply ?? null,
            };
        });
    };
})(Market || (exports.Market = Market = {}));
var Mid;
(function (Mid) {
    Mid.Schema = zod_1.z.object({
        coin: zod_1.z.string(),
        price: zod_1.z.string(),
    });
    Mid.fromAPI = (mids) => Object.entries(mids)
        .map(([coin, price]) => ({ coin, price }))
        .sort((left, right) => left.coin.localeCompare(right.coin));
})(Mid || (exports.Mid = Mid = {}));
