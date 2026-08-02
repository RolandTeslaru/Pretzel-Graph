import type { trading } from "@alpacahq/alpaca-trade-api/rest"

import type { AlpacaClient } from "../client"
import { Alpaca } from "../domain"
import {
    bounded,
    optionalDate,
    plain,
    required,
    type PlainValue,
} from "../domain/common"


const collect = async <T>(source: AsyncIterable<T>, maximum: number): Promise<T[]> => {
    const values: T[] = []

    for await (const value of source) {
        values.push(value)

        if (values.length >= maximum)
            break
    }

    return values
}


export class AlpacaAccountService {

    constructor(private readonly client: AlpacaClient) {}


    public readonly summary = async (): Promise<Alpaca.Account.Summary> =>
        Alpaca.Account.Summary.fromAPI(await this.client.trading.account.getAccount())


    public readonly configuration = async (): Promise<PlainValue> =>
        plain(await this.client.trading.accountConfigurations.getAccountConfig())


    public readonly positions = {
        list: async (): Promise<Alpaca.Account.Position[]> =>
            (await this.client.trading.positions.getAllOpenPositions())
                .map(Alpaca.Account.Position.fromAPI),

        get: async (symbolOrId: string): Promise<Alpaca.Account.Position> =>
            Alpaca.Account.Position.fromAPI(
                await this.client.trading.positions.getOpenPosition({
                    symbolOrAssetId: required(symbolOrId, "symbolOrId"),
                }),
            ),
    }


    public readonly orders = {
        list: async (args: {
            status?:     "open" | "closed" | "all"
            symbols?:    string[]
            side?:       "buy" | "sell"
            direction?:  "asc" | "desc"
            after?:      string
            until?:      string
            limit?:      number
        }): Promise<Alpaca.Trading.Order[]> =>
            (await this.client.trading.orders.getAllOrders({
                status:    args.status ?? "open",
                symbols:   args.symbols?.map(value => value.trim().toUpperCase()).filter(Boolean),
                side:      args.side,
                direction: args.direction ?? "desc",
                after:     optionalDate(args.after, "after")?.toISOString(),
                until:     optionalDate(args.until, "until")?.toISOString(),
                limit:     bounded(args.limit, 50, 500),
            })).map(Alpaca.Trading.Order.fromAPI),

        get: async (orderId: string): Promise<Alpaca.Trading.Order> =>
            Alpaca.Trading.Order.fromAPI(
                await this.client.trading.orders.getOrderByOrderID({
                    orderId: required(orderId, "orderId"),
                }),
            ),
    }


    public readonly activities = async (args: {
        activityTypes?: string[]
        category?:      "trade_activity" | "non_trade_activity"
        direction?:     "asc" | "desc"
        after?:         string
        until?:         string
        limit?:         number
    }): Promise<PlainValue[]> => {
        const maximum = bounded(args.limit, 50, 500)
        const values = await collect(this.client.trading.iterateActivities({
            activityTypes: args.activityTypes as trading.ActivityType[] | undefined,
            category:      args.category,
            direction:     args.direction ?? "desc",
            after:         optionalDate(args.after, "after"),
            until:         optionalDate(args.until, "until"),
            pageSize:      Math.min(maximum, 100),
        }), maximum)

        return values.map(plain)
    }


    public readonly portfolio = async (args: {
        period?:        string
        timeframe?:     string
        start?:         string
        end?:           string
        extendedHours?: boolean
    }): Promise<Alpaca.Account.Portfolio> =>
        Alpaca.Account.Portfolio.fromAPI(
            await this.client.trading.portfolioHistory.getAccountPortfolioHistory({
                period:        args.period ?? "1M",
                timeframe:     args.timeframe ?? "1D",
                start:         optionalDate(args.start, "start"),
                end:           optionalDate(args.end, "end"),
                extendedHours: args.extendedHours === undefined
                    ? undefined
                    : String(args.extendedHours),
            }),
        )


    public readonly watchlists = {
        list: async (): Promise<Alpaca.Account.Watchlist[]> =>
            (await this.client.trading.watchlists.getWatchlists())
                .map(Alpaca.Account.Watchlist.fromAPI),

        get: async (args: { id?: string; name?: string }): Promise<Alpaca.Account.Watchlist> => {
            if (args.id?.trim())
                return Alpaca.Account.Watchlist.fromAPI(
                    await this.client.trading.watchlists.getWatchlistById({
                        watchlistId: args.id.trim(),
                    }),
                )

            return Alpaca.Account.Watchlist.fromAPI(
                await this.client.trading.watchlists.getWatchlistByName({
                    name: required(args.name ?? "", "name"),
                }),
            )
        },
    }
}
