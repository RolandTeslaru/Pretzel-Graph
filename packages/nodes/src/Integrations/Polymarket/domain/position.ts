import { z } from "zod"

import { Activity } from "./activity"
import { Data } from "./Data"


/**
 * What a wallet holds in one outcome, and how that holding has done.
 *
 * Not an Activity: an activity is something that happened, a position is something still held. They
 * share the wallet, market and token references and diverge after that — a position carries cost
 * basis and profit instead of a size and a transaction hash.
 */
export namespace Position {

    const text = (value: string | null | undefined): string | null =>
        value ? value : null

    const references = (position: Data.Position | z.infer<typeof Data.Position.Closed>) => ({
        wallet: position.proxyWallet ?? null,

        market: {
            conditionId: text(position.conditionId),
            question:    text(position.title),
            slug:        text(position.slug),
            eventSlug:   text(position.eventSlug),
        },
        token: {
            id:      text(position.asset),
            outcome: text(position.outcome),
            index:   position.outcomeIndex ?? null,
        },
    })


    /** A holding that is still open. */
    export const Schema = z.object({
        wallet: z.string().nullable(),
        market: Activity.MarketRef,
        token:  Activity.TokenRef,

        /** Token count held. */
        size:     z.number().nullable(),
        /** What it cost on average, against what it's worth now. */
        avgPrice:     z.number().nullable(),
        curPrice:     z.number().nullable(),
        initialValue: z.number().nullable(),
        currentValue: z.number().nullable(),

        /** Unrealised, on the holding as it stands. */
        cashPnl:    z.number().nullable(),
        percentPnl: z.number().nullable(),

        /** Resolved and claimable, versus poolable back into collateral. */
        redeemable: z.boolean().nullable(),
        mergeable:  z.boolean().nullable(),
        endDate:    z.string().nullable(),
    })

    export const fromData = (position: Data.Position): Position => ({
        ...references(position),

        size:         position.size         ?? null,
        avgPrice:     position.avgPrice     ?? null,
        curPrice:     position.curPrice     ?? null,
        initialValue: position.initialValue ?? null,
        currentValue: position.currentValue ?? null,

        cashPnl:    position.cashPnl    ?? null,
        percentPnl: position.percentPnl ?? null,

        redeemable: position.redeemable ?? null,
        mergeable:  position.mergeable  ?? null,
        endDate:    text(position.endDate),
    })


    /** A holding that has been settled — what it actually made, rather than what it might. */
    export namespace Closed {

        export const Schema = z.object({
            wallet: z.string().nullable(),
            market: Activity.MarketRef,
            token:  Activity.TokenRef,

            avgPrice:    z.number().nullable(),
            curPrice:    z.number().nullable(),
            totalBought: z.number().nullable(),

            realizedPnl: z.number().nullable(),

            timestamp: z.number().nullable(),
        })

        export const fromData = (position: z.infer<typeof Data.Position.Closed>): Closed => ({
            ...references(position),

            avgPrice:    position.avgPrice    ?? null,
            curPrice:    position.curPrice    ?? null,
            totalBought: position.totalBought ?? null,

            realizedPnl: position.realizedPnl ?? null,

            timestamp: position.timestamp ?? null,
        })
    }

    export type Closed = z.infer<typeof Closed.Schema>
}

export type Position = z.infer<typeof Position.Schema>
