import type {
    Bar as SDKBar,
    Quote as SDKQuote,
    Trade as SDKTrade,
    marketData,
    trading,
} from "@alpacahq/alpaca-trade-api/rest"
import { marketDataShapes } from "@alpacahq/alpaca-trade-api/rest"
import { z } from "zod"

import { iso } from "./common"


export namespace Asset {
    export const Schema = z.object({
        id:           z.string(),
        symbol:       z.string(),
        name:         z.string(),
        assetClass:   z.string(),
        exchange:     z.string(),
        status:       z.string(),
        tradable:     z.boolean(),
        fractionable: z.boolean(),
        marginable:   z.boolean(),
        shortable:    z.boolean(),
        easyToBorrow: z.boolean().nullable(),
    })

    export const fromAPI = (value: trading.Assets): Asset => ({
        id:           value.id,
        symbol:       value.symbol,
        name:         value.name,
        assetClass:   value._class,
        exchange:     value.exchange,
        status:       value.status,
        tradable:     value.tradable,
        fractionable: value.fractionable,
        marginable:   value.marginable,
        shortable:    value.shortable,
        easyToBorrow: value.easyToBorrow ?? null,
    })
}

export type Asset = z.infer<typeof Asset.Schema>


export namespace Bar {
    export const Schema = z.object({
        symbol:       z.string().nullable(),
        timestamp:    z.string(),
        timestampRaw: z.string().nullable(),
        open:          z.number(),
        high:          z.number(),
        low:           z.number(),
        close:         z.number(),
        volume:        z.number(),
        vwap:          z.number().nullable(),
        tradeCount:    z.number().nullable(),
    })

    export const fromSDK = (value: SDKBar): Bar => ({
        symbol:       value.symbol ?? null,
        timestamp:    value.timestamp.toISOString(),
        timestampRaw: value.timestampRaw ?? null,
        open:          value.open,
        high:          value.high,
        low:           value.low,
        close:         value.close,
        volume:        value.volume,
        vwap:          value.vwap ?? null,
        tradeCount:    value.tradeCount ?? null,
    })
}

export type Bar = z.infer<typeof Bar.Schema>


export namespace Trade {
    export const Schema = z.object({
        symbol:       z.string().nullable(),
        timestamp:    z.string(),
        timestampRaw: z.string().nullable(),
        price:         z.number(),
        size:          z.number(),
        id:            z.number().nullable(),
        idRaw:         z.string().nullable(),
        exchange:      z.string().nullable(),
        conditions:    z.array(z.string()),
        tape:          z.string().nullable(),
        takerSide:     z.string().nullable(),
        update:        z.string().nullable(),
    })

    export const fromSDK = (value: SDKTrade): Trade => ({
        symbol:       value.symbol ?? null,
        timestamp:    value.timestamp.toISOString(),
        timestampRaw: value.timestampRaw ?? null,
        price:         value.price,
        size:          value.size,
        id:            value.id ?? null,
        idRaw:         value.idRaw ?? null,
        exchange:      value.exchange ?? null,
        conditions:    value.conditions ?? [],
        tape:          value.tape ?? null,
        takerSide:     value.takerSide ?? null,
        update:        value.update ?? null,
    })
}

export type Trade = z.infer<typeof Trade.Schema>


export namespace Quote {
    export const Schema = z.object({
        symbol:       z.string().nullable(),
        timestamp:    z.string(),
        timestampRaw: z.string().nullable(),
        bidPrice:      z.number(),
        bidSize:       z.number(),
        bidExchange:   z.string().nullable(),
        askPrice:      z.number(),
        askSize:       z.number(),
        askExchange:   z.string().nullable(),
        conditions:    z.array(z.string()),
        tape:          z.string().nullable(),
    })

    export const fromSDK = (value: SDKQuote): Quote => ({
        symbol:       value.symbol ?? null,
        timestamp:    value.timestamp.toISOString(),
        timestampRaw: value.timestampRaw ?? null,
        bidPrice:      value.bidPrice,
        bidSize:       value.bidSize,
        bidExchange:   value.bidExchange ?? null,
        askPrice:      value.askPrice,
        askSize:       value.askSize,
        askExchange:   value.askExchange ?? null,
        conditions:    value.conditions ?? [],
        tape:          value.tape ?? null,
    })
}

export type Quote = z.infer<typeof Quote.Schema>


export namespace Snapshot {
    export const Schema = z.object({
        symbol:       z.string(),
        assetClass:   z.enum(["stock", "crypto"]),
        latestTrade:  Trade.Schema.nullable(),
        latestQuote:  Quote.Schema.nullable(),
        minuteBar:    Bar.Schema.nullable(),
        dailyBar:     Bar.Schema.nullable(),
        previousDay:  Bar.Schema.nullable(),
    })

    export const fromStock = (symbol: string, value: marketData.StockSnapshot): Snapshot => ({
        symbol,
        assetClass:  "stock",
        latestTrade: value.latestTrade
            ? Trade.fromSDK(marketDataShapes.toStockTrade(value.latestTrade, symbol))
            : null,
        latestQuote: value.latestQuote
            ? Quote.fromSDK(marketDataShapes.toStockQuote(value.latestQuote, symbol))
            : null,
        minuteBar: value.minuteBar
            ? Bar.fromSDK(marketDataShapes.toBar(value.minuteBar, symbol))
            : null,
        dailyBar: value.dailyBar
            ? Bar.fromSDK(marketDataShapes.toBar(value.dailyBar, symbol))
            : null,
        previousDay: value.prevDailyBar
            ? Bar.fromSDK(marketDataShapes.toBar(value.prevDailyBar, symbol))
            : null,
    })

    export const fromCrypto = (symbol: string, value: marketData.CryptoSnapshot): Snapshot => ({
        symbol,
        assetClass:  "crypto",
        latestTrade: value.latestTrade
            ? Trade.fromSDK(marketDataShapes.toCryptoTrade(value.latestTrade, symbol))
            : null,
        latestQuote: value.latestQuote
            ? Quote.fromSDK(marketDataShapes.toCryptoQuote(value.latestQuote, symbol))
            : null,
        minuteBar: value.minuteBar
            ? Bar.fromSDK(marketDataShapes.toBar(value.minuteBar, symbol))
            : null,
        dailyBar: value.dailyBar
            ? Bar.fromSDK(marketDataShapes.toBar(value.dailyBar, symbol))
            : null,
        previousDay: value.prevDailyBar
            ? Bar.fromSDK(marketDataShapes.toBar(value.prevDailyBar, symbol))
            : null,
    })
}

export type Snapshot = z.infer<typeof Snapshot.Schema>


export namespace NewsArticle {
    export const Schema = z.object({
        id:        z.number(),
        headline:  z.string(),
        summary:   z.string(),
        author:    z.string(),
        source:    z.string(),
        symbols:   z.array(z.string()),
        url:       z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
    })

    export const fromAPI = (value: marketData.News): NewsArticle => ({
        id:        value.id,
        headline:  value.headline,
        summary:   value.summary,
        author:    value.author,
        source:    value.source,
        symbols:   value.symbols,
        url:       value.url ?? null,
        createdAt: value.createdAt.toISOString(),
        updatedAt: value.updatedAt.toISOString(),
    })
}

export type NewsArticle = z.infer<typeof NewsArticle.Schema>


export namespace OptionContract {
    export const Schema = z.object({
        id:               z.string(),
        symbol:           z.string(),
        name:             z.string(),
        status:           z.string(),
        tradable:         z.boolean(),
        type:             z.string(),
        style:            z.string(),
        strikePrice:      z.string(),
        expirationDate:   z.string(),
        underlyingSymbol: z.string(),
        multiplier:       z.string(),
        size:             z.string(),
        openInterest:     z.string().nullable(),
        closePrice:       z.string().nullable(),
    })

    export const fromAPI = (value: trading.OptionContract): OptionContract => ({
        id:               value.id,
        symbol:           value.symbol,
        name:             value.name,
        status:           value.status,
        tradable:         value.tradable,
        type:             value.type,
        style:            value.style,
        strikePrice:      value.strikePrice,
        expirationDate:   value.expirationDate.toISOString(),
        underlyingSymbol: value.underlyingSymbol,
        multiplier:       value.multiplier,
        size:             value.size,
        openInterest:     value.openInterest ?? null,
        closePrice:       value.closePrice ?? null,
    })
}

export type OptionContract = z.infer<typeof OptionContract.Schema>


export namespace OptionSnapshot {
    export const Schema = z.object({
        symbol:            z.string(),
        impliedVolatility: z.number().nullable(),
        greeks: z.object({
            delta: z.number(),
            gamma: z.number(),
            rho:   z.number(),
            theta: z.number(),
            vega:  z.number(),
        }).nullable(),
        latestTrade: Trade.Schema.nullable(),
        latestQuote: Quote.Schema.nullable(),
        minuteBar:   Bar.Schema.nullable(),
        dailyBar:    Bar.Schema.nullable(),
        previousDay: Bar.Schema.nullable(),
    })

    export const fromAPI = (symbol: string, value: marketData.OptionSnapshot): OptionSnapshot => ({
        symbol,
        impliedVolatility: value.impliedVolatility ?? null,
        greeks:             value.greeks ?? null,
        latestTrade: value.latestTrade
            ? Trade.fromSDK(marketDataShapes.toOptionTrade(value.latestTrade, symbol))
            : null,
        latestQuote: value.latestQuote
            ? Quote.fromSDK(marketDataShapes.toOptionQuote(value.latestQuote, symbol))
            : null,
        minuteBar: value.minuteBar
            ? Bar.fromSDK(marketDataShapes.toBar(value.minuteBar, symbol))
            : null,
        dailyBar: value.dailyBar
            ? Bar.fromSDK(marketDataShapes.toBar(value.dailyBar, symbol))
            : null,
        previousDay: value.prevDailyBar
            ? Bar.fromSDK(marketDataShapes.toBar(value.prevDailyBar, symbol))
            : null,
    })
}

export type OptionSnapshot = z.infer<typeof OptionSnapshot.Schema>


export namespace MarketClock {
    export const Schema = z.object({
        timestamp: z.string(),
        isOpen:    z.boolean(),
        nextOpen:  z.string(),
        nextClose: z.string(),
    })

    export const fromAPI = (value: trading.LegacyClock): MarketClock => ({
        timestamp: value.timestamp.toISOString(),
        isOpen:    value.isOpen,
        nextOpen:  value.nextOpen.toISOString(),
        nextClose: value.nextClose.toISOString(),
    })
}

export type MarketClock = z.infer<typeof MarketClock.Schema>


export namespace CalendarDay {
    export const Schema = z.object({
        date:           z.string(),
        open:           z.string(),
        close:          z.string(),
        sessionOpen:    z.string(),
        sessionClose:   z.string(),
        settlementDate: z.string(),
    })

    export const fromAPI = (value: trading.LegacyCalendarDay): CalendarDay => ({
        date:           iso(value.date) ?? "",
        open:           value.open,
        close:          value.close,
        sessionOpen:    value.sessionOpen,
        sessionClose:   value.sessionClose,
        settlementDate: iso(value.settlementDate) ?? "",
    })
}

export type CalendarDay = z.infer<typeof CalendarDay.Schema>


export namespace Screener {
    export const Active = z.object({
        symbol:     z.string(),
        volume:     z.number(),
        tradeCount: z.number(),
    })

    export const Mover = z.object({
        symbol:        z.string(),
        price:         z.number(),
        change:        z.number(),
        percentChange: z.number(),
    })

    export const Movers = z.object({
        marketType:  z.string(),
        lastUpdated: z.string(),
        gainers:     z.array(Mover),
        losers:      z.array(Mover),
    })
}
