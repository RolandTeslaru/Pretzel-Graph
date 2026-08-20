"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GammaAPI = void 0;
const zod_1 = require("zod");
const Gamma = __importStar(require("./schemas"));
var GammaAPI;
(function (GammaAPI) {
    let Status;
    (function (Status) {
        let Get;
        (function (Get) {
            Get.Request = zod_1.z.object({}).prefault({});
            Get.Response = zod_1.z.string();
        })(Get = Status.Get || (Status.Get = {}));
    })(Status = GammaAPI.Status || (GammaAPI.Status = {}));
    let Events;
    (function (Events) {
        const BaseQuery = Gamma.Common.DateRange.extend({
            id: zod_1.z.array(Gamma.Event.Id).optional(),
            slug: zod_1.z.array(zod_1.z.string().trim()).optional(),
            closed: zod_1.z.boolean().optional(),
            featured: zod_1.z.boolean().optional(),
            cyom: zod_1.z.boolean().optional(),
            liquidity_min: zod_1.z.number().optional(),
            liquidity_max: zod_1.z.number().optional(),
            volume_min: zod_1.z.number().optional(),
            volume_max: zod_1.z.number().optional(),
        });
        let List;
        (function (List) {
            List.Request = Gamma.Common.LegacyPagination.extend({
                ...BaseQuery.shape,
                tag_id: zod_1.z.number().int().optional(),
                exclude_tag_id: zod_1.z.array(zod_1.z.number().int()).optional(),
                tag_slug: zod_1.z.string().trim().optional(),
                related_tags: zod_1.z.boolean().optional(),
                active: zod_1.z.boolean().optional(),
                archived: zod_1.z.boolean().optional(),
                include_chat: zod_1.z.boolean().optional(),
                include_template: zod_1.z.boolean().optional(),
                recurrence: zod_1.z.string().optional(),
            }).prefault({});
            List.Response = zod_1.z.array(Gamma.Event.Schema);
        })(List = Events.List || (Events.List = {}));
        let ListKeyset;
        (function (ListKeyset) {
            ListKeyset.Request = Gamma.Common.KeysetPagination.extend({
                ...BaseQuery.shape,
                limit: zod_1.z.number().int().min(1).max(500).default(20),
                ascending: zod_1.z.boolean().default(true),
                live: zod_1.z.boolean().optional(),
                title_search: zod_1.z.string().optional(),
                start_time_min: Gamma.Common.DateTime.optional(),
                start_time_max: Gamma.Common.DateTime.optional(),
                tag_id: zod_1.z.array(zod_1.z.number().int()).optional(),
                tag_slug: zod_1.z.string().trim().optional(),
                exclude_tag_id: zod_1.z.array(zod_1.z.number().int()).optional(),
                related_tags: zod_1.z.boolean().optional(),
                tag_match: zod_1.z.string().optional(),
                series_id: zod_1.z.array(zod_1.z.number().int()).optional(),
                game_id: zod_1.z.array(zod_1.z.number().int()).optional(),
                event_date: Gamma.Common.DateTime.optional(),
                event_week: zod_1.z.number().int().optional(),
                featured_order: zod_1.z.boolean().optional(),
                recurrence: zod_1.z.string().optional(),
                created_by: zod_1.z.array(zod_1.z.string()).optional(),
                parent_event_id: zod_1.z.number().int().optional(),
                include_children: zod_1.z.boolean().optional(),
                partner_slug: zod_1.z.string().trim().optional(),
                include_chat: zod_1.z.boolean().optional(),
                include_template: zod_1.z.boolean().optional(),
                include_best_lines: zod_1.z.boolean().optional(),
                locale: zod_1.z.string().optional(),
            }).prefault({});
            ListKeyset.Response = zod_1.z
                .object({
                events: zod_1.z.array(Gamma.Event.Schema),
                next_cursor: zod_1.z.string().optional(),
            })
                .loose();
        })(ListKeyset = Events.ListKeyset || (Events.ListKeyset = {}));
        let GetById;
        (function (GetById) {
            GetById.Request = zod_1.z.object({
                id: Gamma.Event.Id,
                include_chat: zod_1.z.boolean().optional(),
                include_template: zod_1.z.boolean().optional(),
            });
            GetById.Response = Gamma.Event.Schema;
        })(GetById = Events.GetById || (Events.GetById = {}));
        let GetBySlug;
        (function (GetBySlug) {
            GetBySlug.Request = zod_1.z.object({
                slug: zod_1.z.string().trim().min(1),
                include_chat: zod_1.z.boolean().optional(),
                include_template: zod_1.z.boolean().optional(),
            });
            GetBySlug.Response = Gamma.Event.Schema;
        })(GetBySlug = Events.GetBySlug || (Events.GetBySlug = {}));
        let GetTags;
        (function (GetTags) {
            GetTags.Request = zod_1.z.object({ id: Gamma.Event.Id });
            GetTags.Response = zod_1.z.array(Gamma.Tag.Schema);
        })(GetTags = Events.GetTags || (Events.GetTags = {}));
    })(Events = GammaAPI.Events || (GammaAPI.Events = {}));
    let Markets;
    (function (Markets) {
        const BaseQuery = Gamma.Common.DateRange.extend({
            id: zod_1.z.array(Gamma.Market.Id).optional(),
            slug: zod_1.z.array(zod_1.z.string().trim()).optional(),
            clob_token_ids: zod_1.z.array(Gamma.Market.TokenId).optional(),
            condition_ids: zod_1.z.array(Gamma.Market.ConditionId).optional(),
            question_ids: zod_1.z.array(Gamma.Market.QuestionId).optional(),
            market_maker_address: zod_1.z.array(zod_1.z.string()).optional(),
            liquidity_num_min: zod_1.z.number().optional(),
            liquidity_num_max: zod_1.z.number().optional(),
            volume_num_min: zod_1.z.number().optional(),
            volume_num_max: zod_1.z.number().optional(),
            related_tags: zod_1.z.boolean().optional(),
            cyom: zod_1.z.boolean().optional(),
            uma_resolution_status: zod_1.z.string().optional(),
            game_id: zod_1.z.string().optional(),
            sports_market_types: zod_1.z.array(zod_1.z.string()).optional(),
            include_tag: zod_1.z.boolean().optional(),
        });
        let List;
        (function (List) {
            List.Request = Gamma.Common.LegacyPagination.extend({
                ...BaseQuery.shape,
                tag_id: zod_1.z.number().int().optional(),
                rewards_min_size: zod_1.z.number().optional(),
                // Accepted by Gamma and documented in its market-fetching
                // guide, though omitted from the published OpenAPI.
                active: zod_1.z.boolean().optional(),
                closed: zod_1.z.boolean().default(false),
            }).prefault({});
            List.Response = zod_1.z.array(Gamma.Market.Schema);
        })(List = Markets.List || (Markets.List = {}));
        let ListKeyset;
        (function (ListKeyset) {
            ListKeyset.Request = Gamma.Common.KeysetPagination.extend({
                ...BaseQuery.shape,
                limit: zod_1.z.number().int().min(1).max(100).default(20),
                ascending: zod_1.z.boolean().default(true),
                closed: zod_1.z.boolean().default(false),
                decimalized: zod_1.z.boolean().optional(),
                tag_id: zod_1.z.array(zod_1.z.number().int()).optional(),
                tag_match: zod_1.z.string().optional(),
                rfq_enabled: zod_1.z.boolean().optional(),
                locale: zod_1.z.string().optional(),
            }).prefault({});
            ListKeyset.Response = zod_1.z
                .object({
                markets: zod_1.z.array(Gamma.Market.Schema),
                next_cursor: zod_1.z.string().optional(),
            })
                .loose();
        })(ListKeyset = Markets.ListKeyset || (Markets.ListKeyset = {}));
        let GetById;
        (function (GetById) {
            GetById.Request = zod_1.z.object({
                id: Gamma.Market.Id,
                include_tag: zod_1.z.boolean().optional(),
            });
            GetById.Response = Gamma.Market.Schema;
        })(GetById = Markets.GetById || (Markets.GetById = {}));
        let GetBySlug;
        (function (GetBySlug) {
            GetBySlug.Request = zod_1.z.object({
                slug: zod_1.z.string().trim().min(1),
                include_tag: zod_1.z.boolean().optional(),
            });
            GetBySlug.Response = Gamma.Market.Schema;
        })(GetBySlug = Markets.GetBySlug || (Markets.GetBySlug = {}));
        let GetTags;
        (function (GetTags) {
            GetTags.Request = zod_1.z.object({ id: Gamma.Market.Id });
            GetTags.Response = zod_1.z.array(Gamma.Tag.Schema);
        })(GetTags = Markets.GetTags || (Markets.GetTags = {}));
    })(Markets = GammaAPI.Markets || (GammaAPI.Markets = {}));
    let Tags;
    (function (Tags) {
        const BaseQuery = zod_1.z.object({
            omit_empty: zod_1.z.boolean().optional(),
            status: zod_1.z.enum(["active", "closed", "all"]).optional(),
        });
        let List;
        (function (List) {
            List.Request = Gamma.Common.LegacyPagination.extend({
                include_template: zod_1.z.boolean().optional(),
                is_carousel: zod_1.z.boolean().optional(),
            }).prefault({});
            List.Response = zod_1.z.array(Gamma.Tag.Schema);
        })(List = Tags.List || (Tags.List = {}));
        let GetById;
        (function (GetById) {
            GetById.Request = zod_1.z.object({
                id: Gamma.Tag.Id,
                include_template: zod_1.z.boolean().optional(),
            });
            GetById.Response = Gamma.Tag.Schema;
        })(GetById = Tags.GetById || (Tags.GetById = {}));
        let GetBySlug;
        (function (GetBySlug) {
            GetBySlug.Request = zod_1.z.object({
                slug: zod_1.z.string().trim().min(1),
                include_template: zod_1.z.boolean().optional(),
            });
            GetBySlug.Response = Gamma.Tag.Schema;
        })(GetBySlug = Tags.GetBySlug || (Tags.GetBySlug = {}));
        let GetRelationshipsById;
        (function (GetRelationshipsById) {
            GetRelationshipsById.Request = BaseQuery.extend({ id: Gamma.Tag.Id });
            GetRelationshipsById.Response = zod_1.z.array(Gamma.TagRelationship.Schema);
        })(GetRelationshipsById = Tags.GetRelationshipsById || (Tags.GetRelationshipsById = {}));
        let GetRelationshipsBySlug;
        (function (GetRelationshipsBySlug) {
            GetRelationshipsBySlug.Request = BaseQuery.extend({
                slug: zod_1.z.string().trim().min(1),
            });
            GetRelationshipsBySlug.Response = zod_1.z.array(Gamma.TagRelationship.Schema);
        })(GetRelationshipsBySlug = Tags.GetRelationshipsBySlug || (Tags.GetRelationshipsBySlug = {}));
        let GetRelatedById;
        (function (GetRelatedById) {
            GetRelatedById.Request = BaseQuery.extend({ id: Gamma.Tag.Id });
            GetRelatedById.Response = zod_1.z.array(Gamma.Tag.Schema);
        })(GetRelatedById = Tags.GetRelatedById || (Tags.GetRelatedById = {}));
        let GetRelatedBySlug;
        (function (GetRelatedBySlug) {
            GetRelatedBySlug.Request = BaseQuery.extend({
                slug: zod_1.z.string().trim().min(1),
            });
            GetRelatedBySlug.Response = zod_1.z.array(Gamma.Tag.Schema);
        })(GetRelatedBySlug = Tags.GetRelatedBySlug || (Tags.GetRelatedBySlug = {}));
    })(Tags = GammaAPI.Tags || (GammaAPI.Tags = {}));
    let Series;
    (function (Series) {
        let List;
        (function (List) {
            List.Request = Gamma.Common.LegacyPagination.extend({
                slug: zod_1.z.array(zod_1.z.string().trim()).optional(),
                categories_ids: zod_1.z.array(zod_1.z.number().int()).optional(),
                categories_labels: zod_1.z.array(zod_1.z.string()).optional(),
                closed: zod_1.z.boolean().optional(),
                include_chat: zod_1.z.boolean().optional(),
                recurrence: zod_1.z.string().optional(),
                exclude_events: zod_1.z.boolean().optional(),
            }).prefault({});
            List.Response = zod_1.z.array(Gamma.Series.Schema);
        })(List = Series.List || (Series.List = {}));
        let GetById;
        (function (GetById) {
            GetById.Request = zod_1.z.object({
                id: Gamma.Series.Id,
                include_chat: zod_1.z.boolean().optional(),
            });
            GetById.Response = Gamma.Series.Schema;
        })(GetById = Series.GetById || (Series.GetById = {}));
    })(Series = GammaAPI.Series || (GammaAPI.Series = {}));
    let Comments;
    (function (Comments) {
        let List;
        (function (List) {
            List.Request = Gamma.Common.LegacyPagination.extend({
                // Gamma rejects the request unless both parent fields are set,
                // although its published OpenAPI marks them optional.
                parent_entity_type: Gamma.Comment.ParentEntityType,
                parent_entity_id: zod_1.z.coerce.number().int().positive(),
                get_positions: zod_1.z.boolean().optional(),
                holders_only: zod_1.z.boolean().optional(),
            });
            List.Response = zod_1.z.array(Gamma.Comment.Schema);
        })(List = Comments.List || (Comments.List = {}));
        let GetById;
        (function (GetById) {
            GetById.Request = zod_1.z.object({
                id: Gamma.Comment.Id,
                get_positions: zod_1.z.boolean().optional(),
            });
            // Despite the singular path parameter, Gamma returns an array.
            GetById.Response = zod_1.z.array(Gamma.Comment.Schema);
        })(GetById = Comments.GetById || (Comments.GetById = {}));
        let GetByUserAddress;
        (function (GetByUserAddress) {
            GetByUserAddress.Request = Gamma.Common.LegacyPagination.extend({
                user_address: zod_1.z.string(),
            });
            GetByUserAddress.Response = zod_1.z.array(Gamma.Comment.Schema);
        })(GetByUserAddress = Comments.GetByUserAddress || (Comments.GetByUserAddress = {}));
    })(Comments = GammaAPI.Comments || (GammaAPI.Comments = {}));
    let Profiles;
    (function (Profiles) {
        let GetPublic;
        (function (GetPublic) {
            GetPublic.Request = zod_1.z.object({
                address: Gamma.Common.WalletAddress,
            });
            GetPublic.Response = Gamma.Profile.Schema;
        })(GetPublic = Profiles.GetPublic || (Profiles.GetPublic = {}));
    })(Profiles = GammaAPI.Profiles || (GammaAPI.Profiles = {}));
    let Search;
    (function (Search) {
        let Public;
        (function (Public) {
            Public.Request = zod_1.z.object({
                q: zod_1.z.string().trim().min(1),
                cache: zod_1.z.boolean().optional(),
                events_status: zod_1.z.string().optional(),
                limit_per_type: zod_1.z.number().int().min(1).max(500).optional(),
                page: zod_1.z.number().int().optional(),
                events_tag: zod_1.z.array(zod_1.z.string()).optional(),
                keep_closed_markets: zod_1.z.number().int().optional(),
                sort: zod_1.z.string().optional(),
                ascending: zod_1.z.boolean().optional(),
                search_tags: zod_1.z.boolean().optional(),
                search_profiles: zod_1.z.boolean().optional(),
                recurrence: zod_1.z.string().optional(),
                exclude_tag_id: zod_1.z.array(zod_1.z.number().int()).optional(),
                optimized: zod_1.z.boolean().optional(),
            });
            Public.Response = Gamma.Search.Response;
        })(Public = Search.Public || (Search.Public = {}));
    })(Search = GammaAPI.Search || (GammaAPI.Search = {}));
    let Sports;
    (function (Sports) {
        let List;
        (function (List) {
            List.Request = zod_1.z.object({}).prefault({});
            List.Response = zod_1.z.array(Gamma.Sport.Schema);
        })(List = Sports.List || (Sports.List = {}));
        let ListMarketTypes;
        (function (ListMarketTypes) {
            ListMarketTypes.Request = zod_1.z.object({}).prefault({});
            ListMarketTypes.Response = zod_1.z
                .object({
                marketTypes: zod_1.z.array(zod_1.z.string()),
            })
                .loose();
        })(ListMarketTypes = Sports.ListMarketTypes || (Sports.ListMarketTypes = {}));
        let ListTeams;
        (function (ListTeams) {
            ListTeams.Request = Gamma.Common.LegacyPagination.extend({
                league: zod_1.z.array(zod_1.z.string()).optional(),
                name: zod_1.z.array(zod_1.z.string()).optional(),
                abbreviation: zod_1.z.array(zod_1.z.string()).optional(),
            }).prefault({});
            ListTeams.Response = zod_1.z.array(Gamma.Team.Schema);
        })(ListTeams = Sports.ListTeams || (Sports.ListTeams = {}));
    })(Sports = GammaAPI.Sports || (GammaAPI.Sports = {}));
})(GammaAPI || (exports.GammaAPI = GammaAPI = {}));
