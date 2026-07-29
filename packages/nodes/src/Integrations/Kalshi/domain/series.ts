import type { Series as APISeries } from "kalshi-typescript"
import { z } from "zod"


export namespace Series {

    export namespace Meta {

        export const Schema = z.object({
            ticker:    z.string(),
            title:     z.string(),
            category:  z.string(),
            frequency: z.string(),
            tags:      z.array(z.string()),
            volume:    z.string().nullable(),
        })

        export const fromAPI = (series: APISeries): Meta => ({
            ticker:    series.ticker,
            title:     series.title,
            category:  series.category,
            frequency: series.frequency,
            tags:      series.tags ?? [],
            volume:    series.volume_fp ?? null,
        })
    }

    export type Meta = z.infer<typeof Meta.Schema>


    export const Schema = Meta.Schema.extend({
        settlementSources: z.array(z.object({
            name: z.string().nullable(),
            url:  z.string().nullable(),
        })),

        contractUrl:      z.string(),
        contractTermsUrl: z.string(),

        feeType:       z.string(),
        feeMultiplier: z.number(),

        additionalProhibitions: z.array(z.string()),
        lastUpdatedTime:        z.string().nullable(),
        exchangeIndex:          z.number(),
    })


    export const fromAPI = (series: APISeries): Series => ({
        ...Meta.fromAPI(series),

        settlementSources: (series.settlement_sources ?? []).map(source => ({
            name: source.name ?? null,
            url:  source.url  ?? null,
        })),

        contractUrl:      series.contract_url,
        contractTermsUrl: series.contract_terms_url,

        feeType:       series.fee_type,
        feeMultiplier: series.fee_multiplier,

        additionalProhibitions: series.additional_prohibitions ?? [],
        lastUpdatedTime:        series.last_updated_ts ?? null,
        exchangeIndex:          series.exchange_index ?? 0,
    })
}

export type Series = z.infer<typeof Series.Schema>
