import type { Market as APIMarket } from "kalshi-typescript"
import { z } from "zod"


/**
 * The market shape PretzelGraph exposes.
 *
 * Kalshi already owns the wire model through its generated TypeScript client. This is deliberately
 * not a second copy of that contract: it is the smaller, stable result a graph or agent needs,
 * expressed in PretzelGraph naming and without deprecated fields.
 */
export namespace Market {

    export const QueryStatus = z.enum([
        "unopened",
        "open",
        "paused",
        "closed",
        "settled",
    ])

    export type QueryStatus = z.infer<typeof QueryStatus>


    export namespace Meta {

        export const Schema = z.object({
            ticker:      z.string(),
            eventTicker: z.string(),

            yesSubtitle: z.string(),
            noSubtitle:  z.string(),
            status:      z.string(),
            result:      z.string(),

            yesBid:   z.string(),
            yesAsk:   z.string(),
            noBid:    z.string(),
            noAsk:    z.string(),
            lastPrice: z.string(),

            volume:       z.string(),
            volume24h:    z.string(),
            openInterest: z.string(),

            openTime:  z.string(),
            closeTime: z.string(),

            /** True when this row came from Kalshi's historical partition. */
            archived: z.boolean(),
        })

        export const fromAPI = (
            market: APIMarket,
            options: { archived?: boolean } = {},
        ): Meta => ({
            ticker:      market.ticker,
            eventTicker: market.event_ticker,

            yesSubtitle: market.yes_sub_title,
            noSubtitle:  market.no_sub_title,
            status:      market.status,
            result:      market.result,

            yesBid:    market.yes_bid_dollars,
            yesAsk:    market.yes_ask_dollars,
            noBid:     market.no_bid_dollars,
            noAsk:     market.no_ask_dollars,
            lastPrice: market.last_price_dollars,

            volume:       market.volume_fp,
            volume24h:    market.volume_24h_fp,
            openInterest: market.open_interest_fp,

            openTime:  market.open_time,
            closeTime: market.close_time,

            archived: options.archived ?? false,
        })
    }

    export type Meta = z.infer<typeof Meta.Schema>


    export const Schema = Meta.Schema.extend({
        marketType: z.string(),

        createdTime: z.string(),
        updatedTime: z.string(),

        expectedExpirationTime: z.string().nullable(),
        latestExpirationTime:   z.string(),
        settlementTime:         z.string().nullable(),

        settlementTimerSeconds: z.number(),
        settlementValue:        z.string().nullable(),
        expirationValue:        z.string(),

        canCloseEarly:       z.boolean(),
        earlyCloseCondition: z.string().nullable(),

        rulesPrimary:   z.string(),
        rulesSecondary: z.string(),

        notionalValue: z.string(),

        priceLevelStructure: z.string(),
        priceRanges: z.array(z.object({
            start: z.string(),
            end:   z.string(),
            step:  z.string(),
        })),

        isProvisional: z.boolean(),
        exchangeIndex: z.number(),
    })


    export const fromAPI = (
        market: APIMarket,
        options: { archived?: boolean } = {},
    ): Market => ({
        ...Meta.fromAPI(market, options),

        marketType: market.market_type,

        createdTime: market.created_time,
        updatedTime: market.updated_time,

        expectedExpirationTime: market.expected_expiration_time ?? null,
        latestExpirationTime:   market.latest_expiration_time,
        settlementTime:         market.settlement_ts ?? null,

        settlementTimerSeconds: market.settlement_timer_seconds,
        settlementValue:        market.settlement_value_dollars ?? null,
        expirationValue:        market.expiration_value,

        canCloseEarly:       market.can_close_early,
        earlyCloseCondition: market.early_close_condition ?? null,

        rulesPrimary:   market.rules_primary,
        rulesSecondary: market.rules_secondary,

        notionalValue: market.notional_value_dollars,

        priceLevelStructure: market.price_level_structure,
        priceRanges:         market.price_ranges.map(range => ({
            start: range.start,
            end:   range.end,
            step:  range.step,
        })),

        isProvisional: market.is_provisional ?? false,
        exchangeIndex: market.exchange_index ?? 0,
    })
}

export type Market = z.infer<typeof Market.Schema>
