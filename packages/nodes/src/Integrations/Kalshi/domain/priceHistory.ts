import type {
    MarketCandlestick,
    MarketCandlestickHistorical,
} from "kalshi-typescript"
import { z } from "zod"


export namespace PriceHistory {

    export const Interval = z.union([
        z.literal(1),
        z.literal(60),
        z.literal(1440),
    ])

    export type Interval = z.infer<typeof Interval>

    export const Window = z.enum(["1d", "7d", "30d", "90d", "1y", "max"])
    export type Window = z.infer<typeof Window>


    const Distribution = z.object({
        open:  z.string().nullable(),
        low:   z.string().nullable(),
        high:  z.string().nullable(),
        close: z.string().nullable(),
    })

    export const Point = z.object({
        endPeriod: z.string(),

        yesBid: Distribution,
        yesAsk: Distribution,
        price:  Distribution,

        volume:       z.string(),
        openInterest: z.string(),
    })

    export type Point = z.infer<typeof Point>


    export const Schema = z.object({
        ticker:         z.string(),
        source:         z.enum(["live", "historical"]),
        intervalMinutes: Interval,

        startTime: z.string(),
        endTime:   z.string(),
        readings:  z.number().int(),

        firstPrice: z.string().nullable(),
        lastPrice:  z.string().nullable(),
        lowPrice:   z.string().nullable(),
        highPrice:  z.string().nullable(),

        history: z.array(Point),
    })


    const liveDistribution = (
        value: MarketCandlestick["yes_bid"] | MarketCandlestick["yes_ask"],
    ) => ({
        open:  value.open_dollars,
        low:   value.low_dollars,
        high:  value.high_dollars,
        close: value.close_dollars,
    })

    const livePoint = (point: MarketCandlestick): Point => ({
        endPeriod: new Date(point.end_period_ts * 1000).toISOString(),

        yesBid: liveDistribution(point.yes_bid),
        yesAsk: liveDistribution(point.yes_ask),
        price: {
            open:  point.price.open_dollars  ?? null,
            low:   point.price.low_dollars   ?? null,
            high:  point.price.high_dollars  ?? null,
            close: point.price.close_dollars ?? null,
        },

        volume:       point.volume_fp,
        openInterest: point.open_interest_fp,
    })

    const historicalPoint = (point: MarketCandlestickHistorical): Point => ({
        endPeriod: new Date(point.end_period_ts * 1000).toISOString(),

        yesBid: {
            open:  point.yes_bid.open,
            low:   point.yes_bid.low,
            high:  point.yes_bid.high,
            close: point.yes_bid.close,
        },
        yesAsk: {
            open:  point.yes_ask.open,
            low:   point.yes_ask.low,
            high:  point.yes_ask.high,
            close: point.yes_ask.close,
        },
        price: {
            open:  point.price.open,
            low:   point.price.low,
            high:  point.price.high,
            close: point.price.close,
        },

        volume:       point.volume,
        openInterest: point.open_interest,
    })

    /** Evenly samples a long series and always keeps its newest point. */
    const sample = <T>(values: readonly T[], maximum: number): T[] => {
        if (values.length <= maximum)
            return [...values]

        const stride = (values.length - 1) / (maximum - 1)
        const result = Array.from(
            { length: maximum },
            (_, index) => values[Math.round(index * stride)],
        )

        result[maximum - 1] = values[values.length - 1]
        return result
    }


    const build = (args: {
        ticker:  string
        source:  PriceHistory["source"]
        interval: Interval
        startTs: number
        endTs:   number
        points:  Point[]
        maximum: number
    }): PriceHistory => {
        const prices = args.points
            .flatMap(point => point.price.close === null ? [] : [point.price.close])

        const byPrice = [...prices].sort((left, right) => Number(left) - Number(right))

        return {
            ticker:          args.ticker,
            source:          args.source,
            intervalMinutes: args.interval,

            startTime: new Date(args.startTs * 1000).toISOString(),
            endTime:   new Date(args.endTs   * 1000).toISOString(),
            readings:  args.points.length,

            firstPrice: prices[0]  ?? null,
            lastPrice:  prices.at(-1) ?? null,
            lowPrice:   byPrice[0]     ?? null,
            highPrice:  byPrice.at(-1) ?? null,

            history: sample(args.points, Math.max(2, Math.trunc(args.maximum))),
        }
    }


    export const fromLive = (args: {
        ticker: string
        interval: Interval
        startTs: number
        endTs: number
        candlesticks: MarketCandlestick[]
        maximum?: number
    }): PriceHistory => build({
        ...args,
        source:  "live",
        points:  args.candlesticks.map(livePoint),
        maximum: args.maximum ?? 120,
    })


    export const fromHistorical = (args: {
        ticker: string
        interval: Interval
        startTs: number
        endTs: number
        candlesticks: MarketCandlestickHistorical[]
        maximum?: number
    }): PriceHistory => build({
        ...args,
        source:  "historical",
        points:  args.candlesticks.map(historicalPoint),
        maximum: args.maximum ?? 120,
    })
}

export type PriceHistory = z.infer<typeof PriceHistory.Schema>
