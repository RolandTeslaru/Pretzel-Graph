import type { Trade as APITrade } from "kalshi-typescript"
import { z } from "zod"


export namespace Trade {

    export const Schema = z.object({
        id:     z.string(),
        ticker: z.string(),

        count:    z.string(),
        yesPrice: z.string(),
        noPrice:  z.string(),

        takerOutcomeSide: z.enum(["yes", "no"]),
        takerBookSide:    z.enum(["bid", "ask"]),

        createdTime: z.string(),
        blockTrade:  z.boolean(),
        archived:    z.boolean(),
    })


    export const fromAPI = (
        trade: APITrade,
        options: { archived?: boolean } = {},
    ): Trade => ({
        id:     trade.trade_id,
        ticker: trade.ticker,

        count:    trade.count_fp,
        yesPrice: trade.yes_price_dollars,
        noPrice:  trade.no_price_dollars,

        takerOutcomeSide: trade.taker_outcome_side,
        takerBookSide:    trade.taker_book_side,

        createdTime: trade.created_time,
        blockTrade:  trade.is_block_trade,
        archived:    options.archived ?? false,
    })
}

export type Trade = z.infer<typeof Trade.Schema>
