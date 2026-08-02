import { z } from "zod";

import { HyperLiquidAPI } from "./api";


export namespace OrderBook {

    export const DEFAULT_DEPTH = 15;

    export const Level = z.object({
        price:  z.string(),
        size:   z.string(),
        orders: z.number().int().nonnegative(),
    });

    export const Schema = z.object({
        coin: z.string(),
        time: z.number().int(),
        bids: z.array(Level),
        asks: z.array(Level),
        bestBid: z.string().nullable(),
        bestAsk: z.string().nullable(),
        spread:  z.number().nullable(),
        bidLevels: z.number().int().nonnegative(),
        askLevels: z.number().int().nonnegative(),
    });

    const levels = (
        values: ReadonlyArray<z.infer<typeof HyperLiquidAPI.BookLevel>>,
        descending: boolean,
    ) => values
        .map(level => ({ price: level.px, size: level.sz, orders: level.n }))
        .sort((left, right) => descending
            ? Number(right.price) - Number(left.price)
            : Number(left.price) - Number(right.price));

    export const fromAPI = (
        book: z.infer<typeof HyperLiquidAPI.OrderBook>,
        depth: number = DEFAULT_DEPTH,
    ): OrderBook => {
        const bids = levels(book.levels[0], true);
        const asks = levels(book.levels[1], false);
        const bestBid = bids[0]?.price ?? null;
        const bestAsk = asks[0]?.price ?? null;
        const bid = Number(bestBid);
        const ask = Number(bestAsk);

        return {
            coin: book.coin,
            time: book.time,
            bids: bids.slice(0, Math.max(1, Math.trunc(depth))),
            asks: asks.slice(0, Math.max(1, Math.trunc(depth))),
            bestBid,
            bestAsk,
            spread: Number.isFinite(bid) && Number.isFinite(ask) ? ask - bid : null,
            bidLevels: bids.length,
            askLevels: asks.length,
        };
    };
}

export type OrderBook = z.infer<typeof OrderBook.Schema>;
