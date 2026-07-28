import { z } from "zod"

import { CLOB } from "./CLOB"


/**
 * The resting orders for one outcome token — the live exchange state, from the CLOB.
 *
 * Two things this fixes about the wire shape. The CLOB sorts both sides worst-first: `bids[0]` is
 * always 0.001 and `asks[0]` always 0.999, so reading the head of either array gives the least
 * useful order in the book, and an agent asked for the best price to buy would answer 0.999. And
 * prices and sizes arrive as strings.
 *
 * Levels are capped because the tail is resting orders at the extremes that will never fill — a
 * typical book is 60 bids and 160 asks, nearly all of it far from the money. `bidDepth`/`askDepth`
 * total every level, including the ones not shown, so "how much can I move" stays answerable.
 */
export namespace OrderBook {

    export const DEFAULT_DEPTH = 15

    export const Level = z.object({
        price: z.number(),
        size:  z.number(),
    })

    export type Level = z.infer<typeof Level>


    export const Schema = z.object({
        conditionId: z.string().nullable(),
        tokenId:     z.string().nullable(),

        /** Best first. */
        bids: z.array(Level),
        asks: z.array(Level),

        /** The best prices, and the gap between them. Null when a side is empty. */
        bestBid: z.number().nullable(),
        bestAsk: z.number().nullable(),
        spread:  z.number().nullable(),

        /** Total size across every level, not only the ones returned. */
        bidDepth: z.number(),
        askDepth: z.number(),
        /** How many levels exist against how many are shown. */
        bidLevels: z.number().int(),
        askLevels: z.number().int(),

        lastTradePrice: z.number().nullable(),
        tickSize:       z.number().nullable(),
        minOrderSize:   z.number().nullable(),
        negRisk:        z.boolean().nullable(),
    })


    const number = (value: unknown): number | null => {
        if (value === null || value === undefined || value === "")
            return null

        const parsed = Number(value)

        return Number.isFinite(parsed) ? parsed : null
    }

    const levels = (raw: ReadonlyArray<{ price: string; size: string }> | undefined): Level[] =>
        (raw ?? [])
            .map(level => ({ price: number(level.price), size: number(level.size) }))
            .filter((level): level is Level => level.price !== null && level.size !== null)


    export const fromCLOB = (
        book:  z.infer<typeof CLOB.API.MarketData.GetOrderBook.Response>,
        depth: number = DEFAULT_DEPTH,
    ): OrderBook => {

        // Sorted rather than reversed: relying on the CLOB's ordering is what made reading the
        // head of the array wrong in the first place.
        const bids = levels(book.bids as never).sort((left, right) => right.price - left.price)
        const asks = levels(book.asks as never).sort((left, right) => left.price - right.price)

        const total = (side: Level[]) => side.reduce((sum, level) => sum + level.size, 0)

        return {
            conditionId: book.market   ?? null,
            tokenId:     book.asset_id ?? null,

            bids: bids.slice(0, depth),
            asks: asks.slice(0, depth),

            bestBid: bids[0]?.price ?? null,
            bestAsk: asks[0]?.price ?? null,
            spread:  bids[0] && asks[0] ? Number((asks[0].price - bids[0].price).toFixed(6)) : null,

            bidDepth:  total(bids),
            askDepth:  total(asks),
            bidLevels: bids.length,
            askLevels: asks.length,

            lastTradePrice: number(book.last_trade_price),
            tickSize:       number(book.tick_size),
            minOrderSize:   number(book.min_order_size),
            negRisk:        book.neg_risk ?? null,
        }
    }
}

export type OrderBook = z.infer<typeof OrderBook.Schema>
