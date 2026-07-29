import type { HTTP } from "@pretzel-graph/node-sdk"
import {
    EventsApi,
    ExchangeApi,
    HistoricalApi,
    MarketApi,
    type GetEventsStatusEnum,
    type GetMarketCandlesticksPeriodIntervalEnum,
    type GetMarketCandlesticksHistoricalPeriodIntervalEnum,
    type GetMarketsStatusEnum,
    type Market as APIMarket,
} from "kalshi-typescript"

import { Kalshi } from "../domain"


const BASE_PATH = "https://external-api.kalshi.com/trade-api/v2"


export type KalshiPublicAPIs = {
    events:     Pick<EventsApi, "getEvent" | "getEvents">
    exchange:   Pick<ExchangeApi, "getExchangeStatus">
    historical: Pick<
        HistoricalApi,
        | "getHistoricalMarket"
        | "getHistoricalMarkets"
        | "getMarketCandlesticksHistorical"
        | "getTradesHistorical"
    >
    markets: Pick<
        MarketApi,
        | "getMarket"
        | "getMarketCandlesticks"
        | "getMarketOrderbook"
        | "getMarkets"
        | "getSeries"
        | "getSeriesList"
        | "getTrades"
    >
}


export const createKalshiPublicAPIs = (http: HTTP.ClientAPI): KalshiPublicAPIs => {
    // Kalshi's generated client accepts an Axios instance. Keeping this single construction seam
    // preserves PretzelGraph's proxy, abort signal and HTTP error normalization without recreating
    // any of the generated endpoint clients.
    const client = http.create({ vendor: "Kalshi" })

    return {
        events:     new EventsApi(undefined, BASE_PATH, client.raw),
        exchange:   new ExchangeApi(undefined, BASE_PATH, client.raw),
        historical: new HistoricalApi(undefined, BASE_PATH, client.raw),
        markets:    new MarketApi(undefined, BASE_PATH, client.raw),
    }
}


/**
 * Public Kalshi operations in PretzelGraph terms.
 *
 * This is intentionally a facade, not another API client. The official package owns paths,
 * serialization and wire types. This class owns only named arguments, live/historical behavior,
 * result compaction and relationships that require more than one endpoint.
 */
export class KalshiPublicSDK {

    readonly #apis: KalshiPublicAPIs

    constructor(http: HTTP.ClientAPI, apis?: KalshiPublicAPIs) {
        this.#apis = apis ?? createKalshiPublicAPIs(http)
    }


    static #required = (value: string, name: string): string => {
        const result = value.trim()

        if (!result)
            throw new Error(`Kalshi: '${name}' is required.`)

        return result
    }

    static #limit = (value: number | undefined, fallback: number = 20): number =>
        Math.min(Math.max(Math.trunc(value ?? fallback), 1), 1_000)

    static #isNotFound = (error: unknown): boolean => {
        const candidate = error as { status?: unknown; response?: { status?: unknown } }

        return candidate?.status === 404 || candidate?.response?.status === 404
    }

    static #uniqueBy = <T>(values: readonly T[], key: (value: T) => string): T[] => {
        const seen = new Set<string>()

        return values.filter(value => {
            const id = key(value)

            if (seen.has(id))
                return false

            seen.add(id)
            return true
        })
    }


    async #market(ticker: string): Promise<{ market: APIMarket; archived: boolean }> {
        const required = KalshiPublicSDK.#required(ticker, "ticker")

        try {
            const { data } = await this.#apis.markets.getMarket(required)
            return { market: data.market, archived: false }
        }
        catch (error) {
            if (!KalshiPublicSDK.#isNotFound(error))
                throw error

            const { data } = await this.#apis.historical.getHistoricalMarket(required)
            return { market: data.market, archived: true }
        }
    }


    public readonly markets = {

        list: async (args: {
            status:       Kalshi.Market.QueryStatus
            eventTicker?: string
            seriesTicker?: string
            limit?:        number
        }): Promise<Kalshi.Market.Meta[]> => {
            const limit = KalshiPublicSDK.#limit(args.limit)

            const { data: live } = await this.#apis.markets.getMarkets(
                limit,
                undefined,
                args.eventTicker?.trim()  || undefined,
                args.seriesTicker?.trim() || undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                args.status as GetMarketsStatusEnum,
            )

            const markets = live.markets.map(market =>
                Kalshi.Market.Meta.fromAPI(market))

            // Settled markets age out of the live collection as one unit. Querying both partitions
            // is the only way "settled" keeps meaning settled rather than recently settled.
            if (args.status !== "settled")
                return markets

            const { data: historical } = await this.#apis.historical.getHistoricalMarkets(
                limit,
                undefined,
                undefined,
                args.eventTicker?.trim()  || undefined,
                args.seriesTicker?.trim() || undefined,
            )

            return KalshiPublicSDK
                .#uniqueBy([
                    ...markets,
                    ...historical.markets.map(market =>
                        Kalshi.Market.Meta.fromAPI(market, { archived: true })),
                ], market => market.ticker)
                .slice(0, limit)
        },


        get: async (ticker: string): Promise<Kalshi.Market> => {
            const found = await this.#market(ticker)

            return Kalshi.Market.fromAPI(found.market, { archived: found.archived })
        },
    }


    public readonly events = {

        list: async (args: {
            status?:       Kalshi.Event.QueryStatus
            seriesTicker?: string
            includeMarkets?: boolean
            limit?:         number
        } = {}): Promise<Kalshi.Event.Meta[] | Kalshi.Event[]> => {
            const status = args.status === "all" ? undefined : args.status
            const { data } = await this.#apis.events.getEvents(
                KalshiPublicSDK.#limit(args.limit),
                undefined,
                args.includeMarkets ?? false,
                false,
                status as GetEventsStatusEnum | undefined,
                args.seriesTicker?.trim() || undefined,
            )

            return args.includeMarkets
                ? data.events.map(Kalshi.Event.fromAPI)
                : data.events.map(Kalshi.Event.Meta.fromAPI)
        },


        get: async (
            ticker: string,
            options: { includeMarkets?: boolean } = {},
        ): Promise<Kalshi.Event> => {
            const { data } = await this.#apis.events.getEvent(
                KalshiPublicSDK.#required(ticker, "ticker"),
                options.includeMarkets ?? true,
            )

            return Kalshi.Event.fromAPI(data.event)
        },
    }


    public readonly series = {

        list: async (args: {
            category?:     string
            tags?:         string[]
            includeVolume?: boolean
            limit?:         number
        } = {}): Promise<Kalshi.Series.Meta[]> => {
            const { data } = await this.#apis.markets.getSeriesList(
                args.category?.trim() || undefined,
                args.tags?.map(tag => tag.trim()).filter(Boolean).join(",") || undefined,
                false,
                args.includeVolume ?? true,
            )

            return data.series
                .slice(0, KalshiPublicSDK.#limit(args.limit))
                .map(Kalshi.Series.Meta.fromAPI)
        },


        get: async (ticker: string): Promise<Kalshi.Series> => {
            const { data } = await this.#apis.markets.getSeries(
                KalshiPublicSDK.#required(ticker, "ticker"),
                true,
            )

            return Kalshi.Series.fromAPI(data.series)
        },
    }


    public readonly trades = {

        list: async (args: {
            ticker?:          string
            includeHistorical?: boolean
            blockTradesOnly?:  boolean
            limit?:            number
        } = {}): Promise<Kalshi.Trade[]> => {
            const limit  = KalshiPublicSDK.#limit(args.limit, 100)
            const ticker = args.ticker?.trim() || undefined

            const { data: live } = await this.#apis.markets.getTrades(
                limit,
                undefined,
                ticker,
                undefined,
                undefined,
                args.blockTradesOnly || undefined,
            )

            const trades = live.trades.map(trade => Kalshi.Trade.fromAPI(trade))

            if (!args.includeHistorical)
                return trades

            const { data: historical } = await this.#apis.historical.getTradesHistorical(
                ticker,
                undefined,
                undefined,
                limit,
                undefined,
                args.blockTradesOnly || undefined,
            )

            return KalshiPublicSDK
                .#uniqueBy([
                    ...trades,
                    ...historical.trades.map(trade =>
                        Kalshi.Trade.fromAPI(trade, { archived: true })),
                ], trade => trade.id)
                .sort((left, right) => right.createdTime.localeCompare(left.createdTime))
                .slice(0, limit)
        },
    }


    public readonly prices = {

        orderBook: async (args: {
            ticker: string
            depth?: number
        }): Promise<Kalshi.OrderBook> => {
            const ticker = KalshiPublicSDK.#required(args.ticker, "ticker")
            const depth  = Math.min(
                Math.max(Math.trunc(args.depth ?? Kalshi.OrderBook.DEFAULT_DEPTH), 1),
                100,
            )
            const { data } = await this.#apis.markets.getMarketOrderbook(ticker, depth)

            return Kalshi.OrderBook.fromAPI(ticker, data.orderbook_fp, depth)
        },


        history: async (args: {
            ticker:   string
            window:   Kalshi.PriceHistory.Window
            interval: Kalshi.PriceHistory.Interval
            points?:  number
        }): Promise<Kalshi.PriceHistory> => {
            const ticker = KalshiPublicSDK.#required(args.ticker, "ticker")
            const found  = await this.#market(ticker)
            const endTs  = Math.floor(Date.now() / 1_000)

            const seconds = {
                "1d":  86_400,
                "7d":  7 * 86_400,
                "30d": 30 * 86_400,
                "90d": 90 * 86_400,
                "1y":  365 * 86_400,
            } as const

            const opened = Math.floor(new Date(found.market.open_time).getTime() / 1_000)
            const earliest = Number.isFinite(opened)
                ? Math.min(opened, endTs - args.interval * 60)
                : endTs - seconds["1y"]
            const startTs = args.window === "max"
                ? earliest
                : endTs - seconds[args.window]
            const maximum = Math.min(Math.max(Math.trunc(args.points ?? 120), 2), 500)

            if (found.archived) {
                const { data } = await this.#apis.historical.getMarketCandlesticksHistorical(
                    ticker,
                    startTs,
                    endTs,
                    args.interval as GetMarketCandlesticksHistoricalPeriodIntervalEnum,
                )

                return Kalshi.PriceHistory.fromHistorical({
                    ticker,
                    interval: args.interval,
                    startTs,
                    endTs,
                    candlesticks: data.candlesticks,
                    maximum,
                })
            }

            const { data: event } = await this.#apis.events.getEvent(
                found.market.event_ticker,
                false,
            )
            const { data } = await this.#apis.markets.getMarketCandlesticks(
                event.event.series_ticker,
                ticker,
                startTs,
                endTs,
                args.interval as GetMarketCandlesticksPeriodIntervalEnum,
                true,
            )

            return Kalshi.PriceHistory.fromLive({
                ticker,
                interval: args.interval,
                startTs,
                endTs,
                candlesticks: data.candlesticks,
                maximum,
            })
        },
    }


    public readonly exchange = {
        status: async (): Promise<Kalshi.Exchange.Status> => {
            const { data } = await this.#apis.exchange.getExchangeStatus()

            return Kalshi.Exchange.fromAPI(data)
        },
    }
}
