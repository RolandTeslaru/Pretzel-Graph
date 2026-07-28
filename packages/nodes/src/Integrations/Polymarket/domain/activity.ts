import { z } from "zod"

import { Data } from "./Data"


/**
 * Something a wallet did — a fill, a split, a merge, a redemption, a reward.
 *
 * One type for two endpoints: `/activity` is a wallet's history, `/trades` is a market's public
 * fills, and a trade is exactly an activity whose `type` is TRADE. The Data shapes bear that out —
 * the trade schema is a strict subset of the activity schema, with no field of its own.
 *
 * The market and token references are nested rather than flattened across the row. They aren't
 * `Market.Ref` and `Token`: Data identifies a market by conditionId, question and slugs, with no
 * Gamma id or groupItemTitle, so this is the same idea built from what this API actually has.
 */
export namespace Activity {

    /** Empty strings, not nulls, are how Data signals "not applicable" — a REDEEM has no side. */
    const text = (value: string | null | undefined): string | null =>
        value ? value : null


    export const MarketRef = z.object({
        conditionId: z.string().nullable(),
        question:    z.string().nullable(),
        slug:        z.string().nullable(),
        eventSlug:   z.string().nullable(),
    })

    /** Not every market is Yes/No — `outcome` is "Republican" on a party market. */
    export const TokenRef = z.object({
        id:      z.string().nullable(),
        outcome: z.string().nullable(),
        index:   z.number().int().nullable(),
    })


    export const Schema = z.object({
        wallet:    z.string().nullable(),
        timestamp: z.number().nullable(),

        market: MarketRef,
        token:  TokenRef,

        /** TRADE, SPLIT, MERGE, REDEEM, REWARD, DEPOSIT, WITHDRAWAL. */
        type:  z.string().nullable(),
        side:  z.string().nullable(),
        /** Token count. `usdcSize` is the same movement in dollars. */
        size:     z.number().nullable(),
        usdcSize: z.number().nullable(),
        price:    z.number().nullable(),

        transactionHash: z.string().nullable(),
    })


    export const fromData = (activity: Data.Activity): Activity => ({
        wallet:    activity.proxyWallet ?? null,
        timestamp: activity.timestamp   ?? null,

        market: {
            conditionId: text(activity.conditionId),
            question:    text(activity.title),
            slug:        text(activity.slug),
            eventSlug:   text(activity.eventSlug),
        },
        token: {
            id:      text(activity.asset),
            outcome: text(activity.outcome),
            index:   activity.outcomeIndex ?? null,
        },

        type:     text(activity.type),
        side:     text(activity.side),
        size:     activity.size     ?? null,
        usdcSize: activity.usdcSize ?? null,
        price:    activity.price    ?? null,

        transactionHash: text(activity.transactionHash),
    })


    /** A market's public fills. Same shape; `type` is always TRADE, so Data omits it. */
    export const fromTrade = (trade: Data.Trade): Activity => ({
        ...fromData({ ...trade, type: "TRADE" } as unknown as Data.Activity),
        type: "TRADE",
    })
}

export type Activity = z.infer<typeof Activity.Schema>
