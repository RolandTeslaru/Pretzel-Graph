import { z } from "zod"

import { Gamma } from "./Gamma"


/**
 * Our market, not Polymarket's.
 *
 * `Gamma.Market` is the wire mirror — ~100 keys, theirs, free to change. This is the stable shape
 * the rest of PretzelGraph speaks, and `fromGamma` is the only thing that knows how to get from one
 * to the other. Gamma renaming a field costs one function, not every call site.
 */
export namespace Market {

    // Gamma has no status parameter, only independent `active` and `closed` booleans. "all" is our
    // affordance for "don't filter", which is why it can't be expressed as a single query.
    export type Status = "active" | "closed" | "all"

    export const statusQuery = (status: Status): { active?: boolean; closed?: boolean } => {
        if (status === "active")
            return { active: true, closed: false }

        if (status === "closed")
            return { closed: true }

        return {}
    }


    /**
     * One side of a market — the thing that is actually traded.
     *
     * Three APIs, three names for it: Gamma's `clobTokenIds[n]`, CLOB's `token_id`, Data's `asset`.
     * Holding one name here is most of the reason this namespace exists.
     */
    export namespace Token {

        /**
         * What a side is called, what it costs, and the id every pricing call takes.
         *
         * The id is 85 of the ~120 bytes here and it is the only route from a market to its price.
         * Listings carried outcomes without one for a while, on the reasoning that ids are large
         * and rarely needed; what that produced was a caller holding "Gavin Newsom, 12%" and no
         * way to chart him, which it resolved by borrowing an id from elsewhere and silently
         * charting the wrong market.
         */
        export namespace Ref {
            export const Schema = z.object({
                id:      z.string().nullable(),
                outcome: z.string(),
                price:   z.number().nullable(),
            })
        }

        export type Ref = z.infer<typeof Ref.Schema>

        export const Schema = z.object({
            id:      z.string().nullable(),
            outcome: z.string(),
            /** Which side, 0 or 1. What Data's `outcomeIndex` refers to. */
            index:   z.number().int(),
            price:   z.number().nullable(),
            /** Only known after resolution, and never from Gamma. */
            winner:  z.boolean().nullable(),
        })
    }

    export type Token = z.infer<typeof Token.Schema>


    /**
     * A market as a pointer with a price on it — what an Event carries.
     *
     * Full markets don't fit: a 128-candidate event is 118 KB of them. This keeps the label, the
     * ids every other tool takes, and what each side costs, so both "who's leading" and "chart me
     * that one" are answerable from the event alone, at ~410 bytes instead of 945.
     */
    export namespace Ref {

        export const Schema = z.object({
            id:             z.string().nullable(),
            conditionId:    z.string().nullable(),
            /** The row label — "Gavin Newsom" rather than the whole question. */
            groupItemTitle: z.string().nullable(),
            outcomes:       z.array(Token.Ref.Schema),
        })

        export const fromGamma = (market: Gamma.Market): Ref => ({
            id:             toText(market.id),
            conditionId:    market.conditionId    ?? null,
            groupItemTitle: market.groupItemTitle ?? null,
            outcomes:       tokens(market).map(({ id, outcome, price }) => ({ id, outcome, price })),
        })
    }

    export type Ref = z.infer<typeof Ref.Schema>


    /**
     * What the market is, and whether it can be traded — enough to choose one from a list.
     *
     * Carries `Token.Ref`, so a result can be acted on without being fetched again. The ids are
     * 170 bytes of the ~620 here, which is the price of a listing that answers "and now chart me
     * that one" instead of handing back a row you have to look up before you can use it.
     */
    export namespace Meta {

        export const Schema = z.object({
            id:             z.string().nullable(),
            question:       z.string().nullable(),
            slug:           z.string().nullable(),
            conditionId:    z.string().nullable(),
            /** The row label inside its event — "Gavin Newsom" rather than the whole question. */
            groupItemTitle: z.string().nullable(),

            outcomes:       z.array(Token.Ref.Schema),

            active:          z.boolean().nullable(),
            closed:          z.boolean().nullable(),
            /** Distinct from `active`: a live market can have its book closed. */
            acceptingOrders: z.boolean().nullable(),
            endDate:         z.string().nullable(),
            /** "proposed" once an outcome has been submitted to UMA's oracle and the challenge
             *  window is open — the market is mid-settlement and the price may not reflect it.
             *  Null on 199 of 200 markets sampled. */
            resolutionStatus: z.string().nullable(),

            /** Headline size. Kept here because every listing is ordered by volume, and a result
             *  sorted by a number it doesn't show reads as arbitrary. Windows live on MarketStats. */
            volume:    z.number().nullable(),
            liquidity: z.number().nullable(),

            /** Part of a mutually-exclusive group — only one of them can resolve Yes. The group's
             *  id lives on the Event, which is the only place it means anything. */
            negRisk: z.boolean().nullable(),

            eventId:   z.string().nullable(),
            eventSlug: z.string().nullable(),
        })

        export const fromGamma = (market: Gamma.Market): Meta => ({
            id:             toText(market.id),
            question:       market.question       ?? null,
            slug:           market.slug           ?? null,
            conditionId:    market.conditionId    ?? null,
            groupItemTitle: market.groupItemTitle ?? null,

            outcomes:       tokens(market).map(({ id, outcome, price }) => ({ id, outcome, price })),

            active:           market.active          ?? null,
            closed:           market.closed          ?? null,
            acceptingOrders:  market.acceptingOrders ?? null,
            endDate:          market.endDate         ?? null,
            resolutionStatus: market.umaResolutionStatus ?? null,

            volume:    market.volumeNum    ?? market.volume    ?? null,
            liquidity: market.liquidityNum ?? market.liquidity ?? null,

            negRisk: market.negRisk ?? null,

            ...parentEvent(market),
        })
    }

    export type Meta = z.infer<typeof Meta.Schema>


    /** Everything about one market — for when it has already been chosen. */
    export const Schema = Meta.Schema.extend({
        /** The resolution contract: what has to happen for Yes to pay. ~400-1300 characters. */
        description: z.string().nullable(),

        /** With the side index and the winner, which only matter once a market is chosen. */
        outcomes: z.array(Token.Schema),

        /** The UMA question this settles against. Not the same as `conditionId`. */
        questionId:      z.string().nullable(),
        startDate:       z.string().nullable(),
        /** False means it never had a CLOB book — no prices, no order book. */
        enableOrderBook: z.boolean().nullable(),

        tickSize:     z.number().nullable(),
        minOrderSize: z.number().nullable(),
    })


    const toText = (value: unknown): string | null =>
        typeof value === "string" || typeof value === "number" ? String(value) : null

    // Gamma types the parent back-reference as unknown to keep the schema non-recursive, so it's
    // read defensively rather than parsed. In practice a market has exactly one parent event; a
    // sample of 200 live markets found none with more and one with none.
    const parentEvent = (market: Gamma.Market) => {
        const [event] = (market.events ?? []) as Array<{ id?: unknown; slug?: unknown } | undefined>

        return {
            eventId:   toText(event?.id),
            eventSlug: typeof event?.slug === "string" ? event.slug : null,
        }
    }

    /**
     * Gamma reports outcomes, prices and token ids as three parallel arrays that the caller is
     * expected to zip by index — and they are not always the same length. Of 108 sampled markets,
     * 32 had an empty `outcomePrices` while still carrying two outcomes and two tokens (unlaunched
     * candidate slots). Driving off `outcomes` and looking the rest up tolerantly means a missing
     * price arrives as null instead of silently reading as position 0.
     */
    // The serialized-array schemas pass a value through untouched when it isn't valid JSON, so
    // these stay `string | T[]` in the mirror. Anything that didn't decode is treated as absent.
    const asArray = <T>(value: T[] | string | null | undefined): T[] =>
        Array.isArray(value) ? value : []

    export const tokens = (market: Gamma.Market): Token[] =>
        asArray(market.outcomes).map((outcome, index) => ({
            id:      asArray(market.clobTokenIds)[index] ?? null,
            outcome: String(outcome),
            index,
            price:   asArray(market.outcomePrices)[index] ?? null,
            winner:  null,
        }))


    export const fromGamma = (market: Gamma.Market): Market => ({
        ...Meta.fromGamma(market),

        description: market.description ?? null,
        outcomes:    tokens(market),

        questionId:      market.questionID ?? null,
        startDate:       market.startDate  ?? null,
        enableOrderBook: market.enableOrderBook ?? null,

        tickSize:     market.orderPriceMinTickSize ?? null,
        minOrderSize: market.orderMinSize          ?? null,
    })


    export const matchesStatus = (market: Meta, status: Status): boolean => {
        if (status === "active")
            return market.active === true && market.closed !== true

        if (status === "closed")
            return market.closed === true

        return true
    }
}

export type Market = z.infer<typeof Market.Schema>
