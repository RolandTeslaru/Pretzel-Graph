import type { EventData as APIEvent } from "kalshi-typescript"
import { z } from "zod"

import { Market } from "./market"


export namespace Event {

    export const QueryStatus = z.enum([
        "unopened",
        "open",
        "closed",
        "settled",
        "all",
    ])

    export type QueryStatus = z.infer<typeof QueryStatus>


    export namespace Meta {

        export const Schema = z.object({
            ticker:       z.string(),
            seriesTicker: z.string(),
            title:        z.string(),
            subtitle:     z.string(),

            collateralReturnType: z.string(),
            mutuallyExclusive:    z.boolean(),
            availableOnBrokers:   z.boolean(),

            marketCount: z.number().int(),
        })

        export const fromAPI = (event: APIEvent): Meta => ({
            ticker:       event.event_ticker,
            seriesTicker: event.series_ticker,
            title:        event.title,
            subtitle:     event.sub_title,

            collateralReturnType: event.collateral_return_type,
            mutuallyExclusive:    event.mutually_exclusive,
            availableOnBrokers:   event.available_on_brokers,

            marketCount: event.markets?.length ?? 0,
        })
    }

    export type Meta = z.infer<typeof Meta.Schema>


    export const Schema = Meta.Schema.extend({
        strikeDate:   z.string().nullable(),
        strikePeriod: z.string().nullable(),

        settlementSources: z.array(z.object({
            name: z.string().nullable(),
            url:  z.string().nullable(),
        })),

        markets: z.array(Market.Meta.Schema),
    })


    export const fromAPI = (event: APIEvent): Event => ({
        ...Meta.fromAPI(event),

        strikeDate:   event.strike_date   ?? null,
        strikePeriod: event.strike_period ?? null,

        settlementSources: (event.settlement_sources ?? []).map(source => ({
            name: source.name ?? null,
            url:  source.url  ?? null,
        })),

        markets: (event.markets ?? []).map(market => Market.Meta.fromAPI(market)),
    })
}

export type Event = z.infer<typeof Event.Schema>
