"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Series = void 0;
const zod_1 = require("zod");
var Series;
(function (Series) {
    let Meta;
    (function (Meta) {
        Meta.Schema = zod_1.z.object({
            ticker: zod_1.z.string(),
            title: zod_1.z.string(),
            category: zod_1.z.string(),
            frequency: zod_1.z.string(),
            tags: zod_1.z.array(zod_1.z.string()),
            volume: zod_1.z.string().nullable(),
        });
        Meta.fromAPI = (series) => ({
            ticker: series.ticker,
            title: series.title,
            category: series.category,
            frequency: series.frequency,
            tags: series.tags ?? [],
            volume: series.volume_fp ?? null,
        });
    })(Meta = Series.Meta || (Series.Meta = {}));
    Series.Schema = Meta.Schema.extend({
        settlementSources: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().nullable(),
            url: zod_1.z.string().nullable(),
        })),
        contractUrl: zod_1.z.string(),
        contractTermsUrl: zod_1.z.string(),
        feeType: zod_1.z.string(),
        feeMultiplier: zod_1.z.number(),
        additionalProhibitions: zod_1.z.array(zod_1.z.string()),
        lastUpdatedTime: zod_1.z.string().nullable(),
        exchangeIndex: zod_1.z.number(),
    });
    Series.fromAPI = (series) => ({
        ...Meta.fromAPI(series),
        settlementSources: (series.settlement_sources ?? []).map(source => ({
            name: source.name ?? null,
            url: source.url ?? null,
        })),
        contractUrl: series.contract_url,
        contractTermsUrl: series.contract_terms_url,
        feeType: series.fee_type,
        feeMultiplier: series.fee_multiplier,
        additionalProhibitions: series.additional_prohibitions ?? [],
        lastUpdatedTime: series.last_updated_ts ?? null,
        exchangeIndex: series.exchange_index ?? 0,
    });
})(Series || (exports.Series = Series = {}));
