import { z } from "zod"

import * as Gamma from "./schemas"

export namespace GammaAPI {
    export namespace Status {
        export namespace Get {
            export const Request = z.object({}).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.string()
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Events {
        const BaseQuery = Gamma.Common.DateRange.extend({
            id:            z.array(Gamma.Event.Id).optional(),
            slug:          z.array(z.string().trim()).optional(),
            closed:        z.boolean().optional(),
            featured:      z.boolean().optional(),
            cyom:          z.boolean().optional(),
            liquidity_min: z.number().optional(),
            liquidity_max: z.number().optional(),
            volume_min:    z.number().optional(),
            volume_max:    z.number().optional(),
        })

        export namespace List {
            export const Request = Gamma.Common.LegacyPagination.extend({
                ...BaseQuery.shape,
                tag_id:           z.number().int().optional(),
                exclude_tag_id:   z.array(z.number().int()).optional(),
                tag_slug:         z.string().trim().optional(),
                related_tags:     z.boolean().optional(),
                active:           z.boolean().optional(),
                archived:         z.boolean().optional(),
                include_chat:     z.boolean().optional(),
                include_template: z.boolean().optional(),
                recurrence:       z.string().optional(),
            }).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Event.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace ListKeyset {
            export const Request = Gamma.Common.KeysetPagination.extend({
                ...BaseQuery.shape,
                limit:              z.number().int().min(1).max(500).default(20),
                ascending:          z.boolean().default(true),
                live:               z.boolean().optional(),
                title_search:       z.string().optional(),
                start_time_min:     Gamma.Common.DateTime.optional(),
                start_time_max:     Gamma.Common.DateTime.optional(),
                tag_id:             z.array(z.number().int()).optional(),
                tag_slug:           z.string().trim().optional(),
                exclude_tag_id:     z.array(z.number().int()).optional(),
                related_tags:       z.boolean().optional(),
                tag_match:          z.string().optional(),
                series_id:          z.array(z.number().int()).optional(),
                game_id:            z.array(z.number().int()).optional(),
                event_date:         Gamma.Common.DateTime.optional(),
                event_week:         z.number().int().optional(),
                featured_order:     z.boolean().optional(),
                recurrence:         z.string().optional(),
                created_by:         z.array(z.string()).optional(),
                parent_event_id:    z.number().int().optional(),
                include_children:   z.boolean().optional(),
                partner_slug:       z.string().trim().optional(),
                include_chat:       z.boolean().optional(),
                include_template:   z.boolean().optional(),
                include_best_lines: z.boolean().optional(),
                locale:             z.string().optional(),
            }).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z
                .object({
                    events:      z.array(Gamma.Event.Schema),
                    next_cursor: z.string().optional(),
                })
                .loose()
            export type Response = z.infer<typeof Response>
        }

        export namespace GetById {
            export const Request = z.object({
                id:               Gamma.Event.Id,
                include_chat:     z.boolean().optional(),
                include_template: z.boolean().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = Gamma.Event.Schema
            export type Response = z.infer<typeof Response>
        }

        export namespace GetBySlug {
            export const Request = z.object({
                slug:             z.string().trim().min(1),
                include_chat:     z.boolean().optional(),
                include_template: z.boolean().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = Gamma.Event.Schema
            export type Response = z.infer<typeof Response>
        }

        export namespace GetTags {
            export const Request = z.object({ id: Gamma.Event.Id })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Tag.Schema)
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Markets {
        const BaseQuery = Gamma.Common.DateRange.extend({
            id:                    z.array(Gamma.Market.Id).optional(),
            slug:                  z.array(z.string().trim()).optional(),
            clob_token_ids:        z.array(Gamma.Market.TokenId).optional(),
            condition_ids:         z.array(Gamma.Market.ConditionId).optional(),
            question_ids:          z.array(Gamma.Market.QuestionId).optional(),
            market_maker_address:  z.array(z.string()).optional(),
            liquidity_num_min:     z.number().optional(),
            liquidity_num_max:     z.number().optional(),
            volume_num_min:        z.number().optional(),
            volume_num_max:        z.number().optional(),
            related_tags:          z.boolean().optional(),
            cyom:                  z.boolean().optional(),
            uma_resolution_status: z.string().optional(),
            game_id:               z.string().optional(),
            sports_market_types:   z.array(z.string()).optional(),
            include_tag:           z.boolean().optional(),
        })

        export namespace List {
            export const Request = Gamma.Common.LegacyPagination.extend({
                ...BaseQuery.shape,
                tag_id:           z.number().int().optional(),
                rewards_min_size: z.number().optional(),
                // Accepted by Gamma and documented in its market-fetching
                // guide, though omitted from the published OpenAPI.
                active: z.boolean().optional(),
                closed: z.boolean().default(false),
            }).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Market.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace ListKeyset {
            export const Request = Gamma.Common.KeysetPagination.extend({
                ...BaseQuery.shape,
                limit:       z.number().int().min(1).max(100).default(20),
                ascending:   z.boolean().default(true),
                closed:      z.boolean().default(false),
                decimalized: z.boolean().optional(),
                tag_id:      z.array(z.number().int()).optional(),
                tag_match:   z.string().optional(),
                rfq_enabled: z.boolean().optional(),
                locale:      z.string().optional(),
            }).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z
                .object({
                    markets:     z.array(Gamma.Market.Schema),
                    next_cursor: z.string().optional(),
                })
                .loose()
            export type Response = z.infer<typeof Response>
        }

        export namespace GetById {
            export const Request = z.object({
                id:          Gamma.Market.Id,
                include_tag: z.boolean().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = Gamma.Market.Schema
            export type Response = z.infer<typeof Response>
        }

        export namespace GetBySlug {
            export const Request = z.object({
                slug:        z.string().trim().min(1),
                include_tag: z.boolean().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = Gamma.Market.Schema
            export type Response = z.infer<typeof Response>
        }

        export namespace GetTags {
            export const Request = z.object({ id: Gamma.Market.Id })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Tag.Schema)
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Tags {
        const BaseQuery = z.object({
            omit_empty: z.boolean().optional(),
            status:     z.enum(["active", "closed", "all"]).optional(),
        })

        export namespace List {
            export const Request = Gamma.Common.LegacyPagination.extend({
                include_template: z.boolean().optional(),
                is_carousel:      z.boolean().optional(),
            }).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Tag.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace GetById {
            export const Request = z.object({
                id:               Gamma.Tag.Id,
                include_template: z.boolean().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = Gamma.Tag.Schema
            export type Response = z.infer<typeof Response>
        }

        export namespace GetBySlug {
            export const Request = z.object({
                slug:             z.string().trim().min(1),
                include_template: z.boolean().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = Gamma.Tag.Schema
            export type Response = z.infer<typeof Response>
        }

        export namespace GetRelationshipsById {
            export const Request = BaseQuery.extend({ id: Gamma.Tag.Id })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.TagRelationship.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace GetRelationshipsBySlug {
            export const Request = BaseQuery.extend({
                slug: z.string().trim().min(1),
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.TagRelationship.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace GetRelatedById {
            export const Request = BaseQuery.extend({ id: Gamma.Tag.Id })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Tag.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace GetRelatedBySlug {
            export const Request = BaseQuery.extend({
                slug: z.string().trim().min(1),
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Tag.Schema)
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Series {
        export namespace List {
            export const Request = Gamma.Common.LegacyPagination.extend({
                slug:              z.array(z.string().trim()).optional(),
                categories_ids:    z.array(z.number().int()).optional(),
                categories_labels: z.array(z.string()).optional(),
                closed:            z.boolean().optional(),
                include_chat:      z.boolean().optional(),
                recurrence:        z.string().optional(),
                exclude_events:    z.boolean().optional(),
            }).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Series.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace GetById {
            export const Request = z.object({
                id:           Gamma.Series.Id,
                include_chat: z.boolean().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = Gamma.Series.Schema
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Comments {
        export namespace List {
            export const Request = Gamma.Common.LegacyPagination.extend({
                // Gamma rejects the request unless both parent fields are set,
                // although its published OpenAPI marks them optional.
                parent_entity_type: Gamma.Comment.ParentEntityType,
                parent_entity_id:   z.coerce.number().int().positive(),
                get_positions:      z.boolean().optional(),
                holders_only:       z.boolean().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Comment.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace GetById {
            export const Request = z.object({
                id:            Gamma.Comment.Id,
                get_positions: z.boolean().optional(),
            })
            export type Request = z.input<typeof Request>

            // Despite the singular path parameter, Gamma returns an array.
            export const Response = z.array(Gamma.Comment.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace GetByUserAddress {
            export const Request = Gamma.Common.LegacyPagination.extend({
                user_address: z.string(),
            })
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Comment.Schema)
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Profiles {
        export namespace GetPublic {
            export const Request = z.object({
                address: Gamma.Common.WalletAddress,
            })
            export type Request = z.input<typeof Request>

            export const Response = Gamma.Profile.Schema
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Search {
        export namespace Public {
            export const Request = z.object({
                q:                   z.string().trim().min(1),
                cache:               z.boolean().optional(),
                events_status:       z.string().optional(),
                limit_per_type:      z.number().int().min(1).max(500).optional(),
                page:                z.number().int().optional(),
                events_tag:          z.array(z.string()).optional(),
                keep_closed_markets: z.number().int().optional(),
                sort:                z.string().optional(),
                ascending:           z.boolean().optional(),
                search_tags:         z.boolean().optional(),
                search_profiles:     z.boolean().optional(),
                recurrence:          z.string().optional(),
                exclude_tag_id:      z.array(z.number().int()).optional(),
                optimized:           z.boolean().optional(),
            })
            export type Request = z.input<typeof Request>

            export const Response = Gamma.Search.Response
            export type Response = z.infer<typeof Response>
        }
    }

    export namespace Sports {
        export namespace List {
            export const Request = z.object({}).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Sport.Schema)
            export type Response = z.infer<typeof Response>
        }

        export namespace ListMarketTypes {
            export const Request = z.object({}).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z
                .object({
                    marketTypes: z.array(z.string()),
                })
                .loose()
            export type Response = z.infer<typeof Response>
        }

        export namespace ListTeams {
            export const Request = Gamma.Common.LegacyPagination.extend({
                league:       z.array(z.string()).optional(),
                name:         z.array(z.string()).optional(),
                abbreviation: z.array(z.string()).optional(),
            }).prefault({})
            export type Request = z.input<typeof Request>

            export const Response = z.array(Gamma.Team.Schema)
            export type Response = z.infer<typeof Response>
        }
    }
}
