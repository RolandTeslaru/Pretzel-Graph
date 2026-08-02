import type { trading } from "@alpacahq/alpaca-trade-api/rest"
import { z } from "zod"

import { Asset } from "./market"
import { iso } from "./common"


export namespace Summary {
    export const Schema = z.object({
        id:                        z.string(),
        accountNumber:             z.string().nullable(),
        status:                    z.string().nullable(),
        currency:                  z.string().nullable(),
        cash:                      z.string().nullable(),
        equity:                    z.string().nullable(),
        buyingPower:               z.string().nullable(),
        nonMarginableBuyingPower:  z.string().nullable(),
        optionsBuyingPower:        z.string().nullable(),
        portfolioValue:            z.string().nullable(),
        longMarketValue:           z.string().nullable(),
        shortMarketValue:          z.string().nullable(),
        initialMargin:             z.string().nullable(),
        maintenanceMargin:         z.string().nullable(),
        multiplier:                z.string().nullable(),
        patternDayTrader:          z.boolean(),
        tradingBlocked:            z.boolean(),
        transfersBlocked:          z.boolean(),
        accountBlocked:            z.boolean(),
        optionsApprovedLevel:      z.number().nullable(),
        optionsTradingLevel:       z.number().nullable(),
        createdAt:                 z.string().nullable(),
    })

    export const fromAPI = (value: trading.Account): Summary => ({
        id:                       value.id,
        accountNumber:            value.accountNumber ?? null,
        status:                   value.status ?? null,
        currency:                 value.currency ?? null,
        cash:                     value.cash ?? null,
        equity:                   value.equity ?? null,
        buyingPower:              value.buyingPower ?? null,
        nonMarginableBuyingPower: value.nonMarginableBuyingPower ?? null,
        optionsBuyingPower:       value.optionsBuyingPower ?? null,
        portfolioValue:           value.portfolioValue ?? null,
        longMarketValue:          value.longMarketValue ?? null,
        shortMarketValue:         value.shortMarketValue ?? null,
        initialMargin:            value.initialMargin ?? null,
        maintenanceMargin:        value.maintenanceMargin ?? null,
        multiplier:               value.multiplier ?? null,
        patternDayTrader:         Boolean(value.patternDayTrader),
        tradingBlocked:           value.tradingBlocked ?? false,
        transfersBlocked:         value.transfersBlocked ?? false,
        accountBlocked:           value.accountBlocked ?? false,
        optionsApprovedLevel:     value.optionsApprovedLevel ?? null,
        optionsTradingLevel:      value.optionsTradingLevel ?? null,
        createdAt:                iso(value.createdAt),
    })
}

export type Summary = z.infer<typeof Summary.Schema>


export namespace Position {
    export const Schema = z.object({
        assetId:             z.string(),
        symbol:              z.string(),
        assetClass:          z.string(),
        exchange:            z.string(),
        side:                z.string(),
        quantity:            z.string(),
        availableQuantity:   z.string().nullable(),
        averageEntryPrice:   z.string(),
        currentPrice:        z.string(),
        marketValue:         z.string(),
        costBasis:           z.string(),
        unrealizedProfit:    z.string(),
        unrealizedProfitPct: z.string(),
        intradayProfit:      z.string(),
        intradayProfitPct:   z.string(),
        changeToday:         z.string(),
    })

    export const fromAPI = (value: trading.Position): Position => ({
        assetId:             value.assetId,
        symbol:              value.symbol,
        assetClass:          value.assetClass,
        exchange:            value.exchange,
        side:                value.side,
        quantity:            value.qty,
        availableQuantity:   value.qtyAvailable ?? null,
        averageEntryPrice:   value.avgEntryPrice,
        currentPrice:        value.currentPrice,
        marketValue:         value.marketValue,
        costBasis:           value.costBasis,
        unrealizedProfit:    value.unrealizedPl,
        unrealizedProfitPct: value.unrealizedPlpc,
        intradayProfit:      value.unrealizedIntradayPl,
        intradayProfitPct:   value.unrealizedIntradayPlpc,
        changeToday:         value.changeToday,
    })
}

export type Position = z.infer<typeof Position.Schema>


export namespace Portfolio {
    export const Point = z.object({
        timestamp:     z.string(),
        equity:        z.number().nullable(),
        profitLoss:    z.number().nullable(),
        profitLossPct: z.number().nullable(),
    })

    export const Schema = z.object({
        baseValue:      z.number(),
        baseValueAsOf:  z.string().nullable(),
        timeframe:      z.string(),
        points:         z.array(Point),
    })

    export const fromAPI = (value: trading.PortfolioHistory): Portfolio => ({
        baseValue:     value.baseValue,
        baseValueAsOf: iso(value.baseValueAsof),
        timeframe:     value.timeframe,
        points: value.timestamp.map((timestamp, index) => ({
            timestamp:     new Date(timestamp * 1000).toISOString(),
            equity:        value.equity[index] ?? null,
            profitLoss:    value.profitLoss[index] ?? null,
            profitLossPct: value.profitLossPct[index] ?? null,
        })),
    })
}

export type Portfolio = z.infer<typeof Portfolio.Schema>


export namespace Watchlist {
    export const Schema = z.object({
        id:        z.string(),
        name:      z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        assets:    z.array(Asset.Schema),
    })

    export const fromAPI = (
        value: trading.Watchlist | trading.WatchlistWithoutAsset,
    ): Watchlist => ({
        id:        value.id,
        name:      value.name,
        createdAt: value.createdAt.toISOString(),
        updatedAt: value.updatedAt.toISOString(),
        assets:    "assets" in value && value.assets
            ? value.assets.map(Asset.fromAPI)
            : [],
    })
}

export type Watchlist = z.infer<typeof Watchlist.Schema>
