import {
    TimeFrameUnit,
    marketData,
    marketDataShapes,
    timeFrame,
} from "@alpacahq/alpaca-trade-api/rest"

import type { AlpacaClient } from "../client"
import { Alpaca } from "../domain"
import {
    bounded,
    optionalDate,
    required,
} from "../domain/common"


export type MarketAssetClass = "stock" | "crypto" | "option"
export type StockFeed = "iex" | "sip" | "otc" | "boats"
export type TimeframeUnit = "minute" | "hour" | "day" | "week" | "month"


const unit = (value: TimeframeUnit): TimeFrameUnit => ({
    minute: TimeFrameUnit.Minute,
    hour:   TimeFrameUnit.Hour,
    day:    TimeFrameUnit.Day,
    week:   TimeFrameUnit.Week,
    month:  TimeFrameUnit.Month,
})[value]


const collect = async <T>(source: AsyncIterable<T>, maximum: number): Promise<T[]> => {
    const values: T[] = []

    for await (const value of source) {
        values.push(value)

        if (values.length >= maximum)
            break
    }

    return values
}


export class AlpacaMarketService {

    constructor(private readonly client: AlpacaClient) {}


    public readonly assets = {
        list: async (args: {
            query?:      string
            status?:     "active" | "inactive"
            assetClass?: "us_equity" | "crypto" | "us_option"
            exchange?:   string
            limit?:      number
        }): Promise<Alpaca.Market.Asset[]> => {
            const maximum = bounded(args.limit, 20, 1_000)
            const query   = args.query?.trim().toLowerCase()

            const values = await this.client.trading.assets.getV2Assets({
                status:     args.status ?? "active",
                assetClass: args.assetClass,
                exchange:   args.exchange?.trim() || undefined,
            })

            return values
                .filter(value => !query
                    || value.symbol.toLowerCase().includes(query)
                    || value.name.toLowerCase().includes(query))
                .slice(0, maximum)
                .map(Alpaca.Market.Asset.fromAPI)
        },

        get: async (symbolOrId: string): Promise<Alpaca.Market.Asset> =>
            Alpaca.Market.Asset.fromAPI(
                await this.client.trading.assets.getV2AssetsSymbolOrAssetId({
                    symbolOrAssetId: required(symbolOrId, "symbolOrId"),
                }),
            ),
    }


    public readonly clock = async (): Promise<Alpaca.Market.Clock> =>
        Alpaca.Market.Clock.fromAPI(await this.client.trading.clock.legacyClock())


    public readonly calendar = async (args: {
        start?: string
        end?:   string
        limit?: number
    }): Promise<Alpaca.Market.CalendarDay[]> => {
        const values = await this.client.trading.calendar.legacyCalendar({
            start: optionalDate(args.start, "start"),
            end:   optionalDate(args.end, "end"),
        })

        return values
            .slice(0, bounded(args.limit, 30, 1_000))
            .map(Alpaca.Market.CalendarDay.fromAPI)
    }


    public readonly bars = async (args: {
        assetClass: MarketAssetClass
        symbol:     string
        unit:       TimeframeUnit
        multiplier?: number
        start?:     string
        end?:       string
        limit?:     number
        feed?:      StockFeed
    }): Promise<Alpaca.Market.Bar[]> => {
        const symbol    = required(args.symbol, "symbol").toUpperCase()
        const maximum   = bounded(args.limit, 200, 5_000)
        const timeframe = timeFrame(args.multiplier ?? 1, unit(args.unit))
        const common    = {
            timeframe,
            start: optionalDate(args.start, "start"),
            end:   optionalDate(args.end, "end"),
            limit: Math.min(maximum, 10_000),
        }

        if (args.assetClass === "stock")
            return (await this.client.marketData.getStockBarsFor(symbol, {
                ...common,
                feed:       (args.feed ?? "iex") as marketData.StockHistoricalFeed,
                adjustment: "raw",
            }, { maxPerSymbol: maximum })).map(Alpaca.Market.Bar.fromSDK)

        if (args.assetClass === "crypto")
            return (await this.client.marketData.getCryptoBarsFor(symbol, {
                ...common,
                loc: marketData.CryptoHistoricalLoc.Us,
            }, { maxPerSymbol: maximum })).map(Alpaca.Market.Bar.fromSDK)

        return (await this.client.marketData.getOptionBarsFor(symbol, common, {
            maxPerSymbol: maximum,
        })).map(Alpaca.Market.Bar.fromSDK)
    }


    public readonly trades = async (args: {
        assetClass: MarketAssetClass
        symbol:     string
        start?:     string
        end?:       string
        limit?:     number
        feed?:      StockFeed
    }): Promise<Alpaca.Market.Trade[]> => {
        const symbol  = required(args.symbol, "symbol").toUpperCase()
        const maximum = bounded(args.limit, 100, 1_000)
        const common  = {
            start: optionalDate(args.start, "start"),
            end:   optionalDate(args.end, "end"),
            limit: maximum,
        }

        if (args.assetClass === "stock")
            return (await this.client.marketData.getStockTradesFor(symbol, {
                ...common,
                feed: (args.feed ?? "iex") as marketData.StockHistoricalFeed,
            }, { maxPerSymbol: maximum })).map(Alpaca.Market.Trade.fromSDK)

        if (args.assetClass === "crypto")
            return (await this.client.marketData.getCryptoTradesFor(symbol, {
                ...common,
                loc: marketData.CryptoHistoricalLoc.Us,
            }, { maxPerSymbol: maximum })).map(Alpaca.Market.Trade.fromSDK)

        const values = await this.client.marketData.collectOptionTradesBySymbol({
            symbols: symbol,
            ...common,
        }, { maxPerSymbol: maximum })

        return (values[symbol] ?? [])
            .map(value => marketDataShapes.toOptionTrade(value, symbol))
            .map(Alpaca.Market.Trade.fromSDK)
    }


    public readonly quotes = async (args: {
        assetClass: Exclude<MarketAssetClass, "option">
        symbol:     string
        start?:     string
        end?:       string
        limit?:     number
        feed?:      StockFeed
    }): Promise<Alpaca.Market.Quote[]> => {
        const symbol  = required(args.symbol, "symbol").toUpperCase()
        const maximum = bounded(args.limit, 100, 1_000)
        const common  = {
            start: optionalDate(args.start, "start"),
            end:   optionalDate(args.end, "end"),
            limit: maximum,
        }

        if (args.assetClass === "stock")
            return (await this.client.marketData.getStockQuotesFor(symbol, {
                ...common,
                feed: (args.feed ?? "iex") as marketData.StockHistoricalFeed,
            }, { maxPerSymbol: maximum })).map(Alpaca.Market.Quote.fromSDK)

        return (await this.client.marketData.getCryptoQuotesFor(symbol, {
            ...common,
            loc: marketData.CryptoHistoricalLoc.Us,
        }, { maxPerSymbol: maximum })).map(Alpaca.Market.Quote.fromSDK)
    }


    public readonly snapshot = async (args: {
        assetClass: "stock" | "crypto"
        symbol:     string
        feed?:      StockFeed
    }): Promise<Alpaca.Market.Snapshot> => {
        const symbol = required(args.symbol, "symbol").toUpperCase()

        if (args.assetClass === "stock") {
            const values = await this.client.marketData.stocks.stockSnapshots({
                symbols: symbol,
                feed:    (args.feed ?? "iex") as marketData.StockLatestFeed,
            })

            const value = values[symbol]
            if (!value)
                throw new Error(`Alpaca: no stock snapshot returned for '${symbol}'.`)

            return Alpaca.Market.Snapshot.fromStock(symbol, value)
        }

        const response = await this.client.marketData.crypto.cryptoSnapshots({
            symbols: symbol,
            loc:     marketData.CryptoLatestLoc.Us,
        })
        const value = response.snapshots[symbol]

        if (!value)
            throw new Error(`Alpaca: no crypto snapshot returned for '${symbol}'.`)

        return Alpaca.Market.Snapshot.fromCrypto(symbol, value)
    }


    public readonly news = async (args: {
        symbols?: string[]
        start?:   string
        end?:     string
        limit?:   number
    }): Promise<Alpaca.Market.NewsArticle[]> => {
        const maximum = bounded(args.limit, 10, 100)

        return (await collect(this.client.marketData.iterateNews({
            symbols: args.symbols?.map(value => value.trim().toUpperCase()).filter(Boolean),
            start:   optionalDate(args.start, "start"),
            end:     optionalDate(args.end, "end"),
            limit:   Math.min(maximum, 50),
        }), maximum)).map(Alpaca.Market.NewsArticle.fromAPI)
    }


    public readonly optionContracts = {
        list: async (args: {
            underlyingSymbols?: string[]
            status?:            "active" | "inactive"
            type?:              "call" | "put"
            expirationDate?:    string
            expirationFrom?:    string
            expirationTo?:      string
            strikeFrom?:        number
            strikeTo?:          number
            limit?:             number
        }): Promise<Alpaca.Market.OptionContract[]> => {
            const maximum = bounded(args.limit, 50, 1_000)
            const values = await collect(this.client.trading.iterateOptionsContracts({
                underlyingSymbols: args.underlyingSymbols
                    ?.map(value => value.trim().toUpperCase())
                    .filter(Boolean)
                    .join(",") || undefined,
                status:            args.status,
                type:              args.type,
                expirationDate:    optionalDate(args.expirationDate, "expirationDate"),
                expirationDateGte: optionalDate(args.expirationFrom, "expirationFrom"),
                expirationDateLte: optionalDate(args.expirationTo, "expirationTo"),
                strikePriceGte:    args.strikeFrom,
                strikePriceLte:    args.strikeTo,
                limit:             Math.min(maximum, 100),
            }), maximum)

            return values.map(Alpaca.Market.OptionContract.fromAPI)
        },

        get: async (symbolOrId: string): Promise<Alpaca.Market.OptionContract> =>
            Alpaca.Market.OptionContract.fromAPI(
                await this.client.trading.assets.getOptionContractSymbolOrId({
                    symbolOrId: required(symbolOrId, "symbolOrId"),
                }),
            ),
    }


    public readonly optionChain = async (args: {
        underlyingSymbol: string
        type?:            "call" | "put"
        expirationDate?:  string
        expirationFrom?:  string
        expirationTo?:    string
        strikeFrom?:      number
        strikeTo?:        number
        limit?:           number
    }): Promise<Alpaca.Market.OptionSnapshot[]> => {
        const maximum = bounded(args.limit, 50, 500)
        const values  = await collect(this.client.marketData.iterateOptionChain({
            underlyingSymbol: required(args.underlyingSymbol, "underlyingSymbol").toUpperCase(),
            type:              args.type,
            expirationDate:    optionalDate(args.expirationDate, "expirationDate"),
            expirationDateGte: optionalDate(args.expirationFrom, "expirationFrom"),
            expirationDateLte: optionalDate(args.expirationTo, "expirationTo"),
            strikePriceGte:    args.strikeFrom,
            strikePriceLte:    args.strikeTo,
            limit:             Math.min(maximum, 100),
        }), maximum)

        return values.map(({ symbol, value }) => Alpaca.Market.OptionSnapshot.fromAPI(symbol, value))
    }


    public readonly mostActives = async (args: {
        by?:    "volume" | "trades"
        limit?: number
    }) => {
        const response = await this.client.marketData.screener.mostActives({
            by:  args.by ?? "volume",
            top: bounded(args.limit, 10, 100),
        })

        return {
            lastUpdated: response.lastUpdated,
            results:     response.mostActives,
        }
    }


    public readonly movers = async (args: {
        marketType?: "stocks" | "crypto"
        limit?:      number
    }) => {
        const response = await this.client.marketData.screener.movers({
            marketType: args.marketType ?? "stocks",
            top:        bounded(args.limit, 10, 100),
        })

        return {
            marketType:  response.marketType,
            lastUpdated: response.lastUpdated,
            gainers:     response.gainers,
            losers:      response.losers,
        }
    }
}
