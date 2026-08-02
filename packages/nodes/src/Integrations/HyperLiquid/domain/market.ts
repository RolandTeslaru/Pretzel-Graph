import { z } from "zod";

import { HyperLiquidAPI } from "./api";


const MarketContext = {
    markPrice:         z.string().nullable(),
    midPrice:          z.string().nullable(),
    previousDayPrice:  z.string().nullable(),
    dayNotionalVolume: z.string().nullable(),
    dayBaseVolume:     z.string().nullable(),
};


export namespace Market {

    export const Perpetual = z.object({
        kind:          z.literal("perpetual"),
        coin:          z.string(),
        dex:           z.string(),
        sizeDecimals:  z.number().int().nonnegative(),
        maxLeverage:   z.number().int().positive(),
        onlyIsolated:  z.boolean(),
        marginTableId: z.number().int().nullable(),
        delisted:      z.boolean(),
        ...MarketContext,
        oraclePrice: z.string().nullable(),
        funding:     z.string().nullable(),
        premium:     z.string().nullable(),
        openInterest: z.string().nullable(),
    });

    export const Spot = z.object({
        kind:          z.literal("spot"),
        coin:          z.string(),
        index:         z.number().int().nonnegative(),
        baseToken:     z.string().nullable(),
        quoteToken:    z.string().nullable(),
        canonical:     z.boolean(),
        ...MarketContext,
        circulatingSupply: z.string().nullable(),
        totalSupply:       z.string().nullable(),
    });

    export const Schema = z.discriminatedUnion("kind", [Perpetual, Spot]);


    export const perpetualsFromAPI = (
        dex: string,
        response: z.infer<typeof HyperLiquidAPI.PerpetualMetaAndAssetContexts>,
    ): Market[] => {
        const [meta, contexts] = response;

        return meta.universe.map((asset, index) => {
            const context = contexts[index];

            return {
                kind:              "perpetual" as const,
                coin:              asset.name,
                dex,
                sizeDecimals:      asset.szDecimals,
                maxLeverage:       asset.maxLeverage,
                onlyIsolated:      asset.onlyIsolated ?? false,
                marginTableId:     asset.marginTableId ?? null,
                delisted:          asset.isDelisted ?? false,
                markPrice:         context?.markPx ?? null,
                midPrice:          context?.midPx ?? null,
                oraclePrice:       context?.oraclePx ?? null,
                previousDayPrice:  context?.prevDayPx ?? null,
                dayNotionalVolume: context?.dayNtlVlm ?? null,
                dayBaseVolume:     context?.dayBaseVlm ?? null,
                funding:           context?.funding ?? null,
                premium:           context?.premium ?? null,
                openInterest:      context?.openInterest ?? null,
            };
        });
    };


    export const spotsFromAPI = (
        response: z.infer<typeof HyperLiquidAPI.SpotMetaAndAssetContexts>,
    ): Market[] => {
        const [meta, contexts] = response;
        const tokens = new Map(meta.tokens.map(token => [token.index, token]));
        const contextsByCoin = new Map(contexts.map(context => [context.coin, context]));

        return meta.universe.map(pair => {
            const context = contextsByCoin.get(pair.name);

            return {
                kind:              "spot" as const,
                coin:              pair.name,
                index:             pair.index,
                baseToken:         tokens.get(pair.tokens[0])?.name ?? null,
                quoteToken:        tokens.get(pair.tokens[1])?.name ?? null,
                canonical:         pair.isCanonical,
                markPrice:         context?.markPx ?? null,
                midPrice:          context?.midPx ?? null,
                previousDayPrice:  context?.prevDayPx ?? null,
                dayNotionalVolume: context?.dayNtlVlm ?? null,
                dayBaseVolume:     context?.dayBaseVlm ?? null,
                circulatingSupply: context?.circulatingSupply ?? null,
                totalSupply:       context?.totalSupply ?? null,
            };
        });
    };
}

export type Market = z.infer<typeof Market.Schema>;


export namespace Mid {
    export const Schema = z.object({
        coin:  z.string(),
        price: z.string(),
    });

    export const fromAPI = (mids: Record<string, string>): Mid[] =>
        Object.entries(mids)
            .map(([coin, price]) => ({ coin, price }))
            .sort((left, right) => left.coin.localeCompare(right.coin));
}

export type Mid = z.infer<typeof Mid.Schema>;
