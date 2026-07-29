import type { OrderbookCountFp as APIOrderBook } from "kalshi-typescript"
import { z } from "zod"


export namespace OrderBook {

    export const DEFAULT_DEPTH = 15

    export const Level = z.object({
        price: z.string(),
        count: z.string(),
    })

    export type Level = z.infer<typeof Level>


    export const Schema = z.object({
        ticker: z.string(),

        /** Kalshi transmits bids on both outcomes. The asks here are their exact complements. */
        yesBids: z.array(Level),
        yesAsks: z.array(Level),
        noBids:  z.array(Level),
        noAsks:  z.array(Level),

        bestYesBid: z.string().nullable(),
        bestYesAsk: z.string().nullable(),
        bestNoBid:  z.string().nullable(),
        bestNoAsk:  z.string().nullable(),
        yesSpread:  z.string().nullable(),
        noSpread:   z.string().nullable(),

        yesBidLevels: z.number().int(),
        noBidLevels:  z.number().int(),
    })


    const SCALE = 1_000_000n

    const units = (value: string): bigint | null => {
        if (!/^\d+(?:\.\d{1,6})?$/.test(value))
            return null

        const [whole, fraction = ""] = value.split(".")
        return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"))
    }

    const format = (value: bigint): string => {
        const sign     = value < 0n ? "-" : ""
        const absolute = value < 0n ? -value : value
        const whole    = absolute / SCALE
        const fraction = (absolute % SCALE).toString().padStart(6, "0")
            .replace(/0+$/, "")
            .padEnd(4, "0")

        return `${sign}${whole}.${fraction}`
    }

    const complement = (value: string): string | null => {
        const parsed = units(value)

        return parsed === null || parsed < 0n || parsed > SCALE
            ? null
            : format(SCALE - parsed)
    }

    const spread = (bid: string | undefined, ask: string | undefined): string | null => {
        if (bid === undefined || ask === undefined)
            return null

        const bidUnits = units(bid)
        const askUnits = units(ask)

        return bidUnits === null || askUnits === null
            ? null
            : format(askUnits - bidUnits)
    }

    const levels = (raw: ReadonlyArray<ReadonlyArray<string>>): Level[] =>
        raw.flatMap(level => {
            const [price, count] = level
            return price && count && units(price) !== null
                ? [{ price, count }]
                : []
        })

    const bids = (raw: ReadonlyArray<ReadonlyArray<string>>): Level[] =>
        levels(raw).sort((left, right) => Number(right.price) - Number(left.price))

    const asks = (oppositeBids: readonly Level[]): Level[] =>
        oppositeBids
            .flatMap(level => {
                const price = complement(level.price)
                return price === null ? [] : [{ price, count: level.count }]
            })
            .sort((left, right) => Number(left.price) - Number(right.price))


    export const fromAPI = (
        ticker: string,
        book: APIOrderBook,
        depth: number = DEFAULT_DEPTH,
    ): OrderBook => {
        const yesBids = bids(book.yes_dollars)
        const noBids  = bids(book.no_dollars)
        const yesAsks = asks(noBids)
        const noAsks  = asks(yesBids)
        const cap     = Math.max(1, Math.trunc(depth))

        return {
            ticker,

            yesBids: yesBids.slice(0, cap),
            yesAsks: yesAsks.slice(0, cap),
            noBids:  noBids.slice(0, cap),
            noAsks:  noAsks.slice(0, cap),

            bestYesBid: yesBids[0]?.price ?? null,
            bestYesAsk: yesAsks[0]?.price ?? null,
            bestNoBid:  noBids[0]?.price  ?? null,
            bestNoAsk:  noAsks[0]?.price  ?? null,
            yesSpread:  spread(yesBids[0]?.price, yesAsks[0]?.price),
            noSpread:   spread(noBids[0]?.price, noAsks[0]?.price),

            yesBidLevels: yesBids.length,
            noBidLevels:  noBids.length,
        }
    }
}

export type OrderBook = z.infer<typeof OrderBook.Schema>
