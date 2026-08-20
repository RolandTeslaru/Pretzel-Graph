"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketGammaClient = exports.POLYMARKET_GAMMA_BASE_URL = void 0;
const utils_1 = require("../../../utils");
const domain_1 = require("../domain");
exports.POLYMARKET_GAMMA_BASE_URL = "https://gamma-api.polymarket.com";
class PolymarketGammaClient {
    #client;
    constructor(http) {
        this.#client = http.create({
            vendor: "Polymarket",
            baseURL: exports.POLYMARKET_GAMMA_BASE_URL,
            headers: { "User-Agent": "PretzelGraph/1.0" },
            // Gamma arrays use repeated keys: ?id=1&id=2.
            paramsSerializer: { indexes: null },
        });
    }
    async get(path, params) {
        return this.#client.get(path, { params });
    }
    status = {
        get: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Status.Get.Request, domain_1.Polymarket.Gamma.API.Status.Get.Response, () => this.get("/status")),
    };
    events = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Events.List.Request, domain_1.Polymarket.Gamma.API.Events.List.Response, (request) => this.get("/events", request)),
        listKeyset: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Events.ListKeyset.Request, domain_1.Polymarket.Gamma.API.Events.ListKeyset.Response, (request) => this.get("/events/keyset", request)),
        getById: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Events.GetById.Request, domain_1.Polymarket.Gamma.API.Events.GetById.Response, ({ id, ...query }) => this.get(`/events/${encodeURIComponent(id)}`, query)),
        getBySlug: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Events.GetBySlug.Request, domain_1.Polymarket.Gamma.API.Events.GetBySlug.Response, ({ slug, ...query }) => this.get(`/events/slug/${encodeURIComponent(slug)}`, query)),
        getTags: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Events.GetTags.Request, domain_1.Polymarket.Gamma.API.Events.GetTags.Response, ({ id }) => this.get(`/events/${encodeURIComponent(id)}/tags`)),
    };
    markets = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Markets.List.Request, domain_1.Polymarket.Gamma.API.Markets.List.Response, (request) => this.get("/markets", request)),
        listKeyset: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Markets.ListKeyset.Request, domain_1.Polymarket.Gamma.API.Markets.ListKeyset.Response, (request) => this.get("/markets/keyset", request)),
        getById: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Markets.GetById.Request, domain_1.Polymarket.Gamma.API.Markets.GetById.Response, ({ id, ...query }) => this.get(`/markets/${encodeURIComponent(id)}`, query)),
        getBySlug: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Markets.GetBySlug.Request, domain_1.Polymarket.Gamma.API.Markets.GetBySlug.Response, ({ slug, ...query }) => this.get(`/markets/slug/${encodeURIComponent(slug)}`, query)),
        getTags: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Markets.GetTags.Request, domain_1.Polymarket.Gamma.API.Markets.GetTags.Response, ({ id }) => this.get(`/markets/${encodeURIComponent(id)}/tags`)),
    };
    tags = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Tags.List.Request, domain_1.Polymarket.Gamma.API.Tags.List.Response, (request) => this.get("/tags", request)),
        getById: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Tags.GetById.Request, domain_1.Polymarket.Gamma.API.Tags.GetById.Response, ({ id, ...query }) => this.get(`/tags/${encodeURIComponent(id)}`, query)),
        getBySlug: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Tags.GetBySlug.Request, domain_1.Polymarket.Gamma.API.Tags.GetBySlug.Response, ({ slug, ...query }) => this.get(`/tags/slug/${encodeURIComponent(slug)}`, query)),
        getRelationshipsById: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Tags.GetRelationshipsById.Request, domain_1.Polymarket.Gamma.API.Tags.GetRelationshipsById.Response, ({ id, ...query }) => this.get(`/tags/${encodeURIComponent(id)}/related-tags`, query)),
        getRelationshipsBySlug: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Tags.GetRelationshipsBySlug.Request, domain_1.Polymarket.Gamma.API.Tags.GetRelationshipsBySlug.Response, ({ slug, ...query }) => this.get(`/tags/slug/${encodeURIComponent(slug)}/related-tags`, query)),
        getRelatedById: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Tags.GetRelatedById.Request, domain_1.Polymarket.Gamma.API.Tags.GetRelatedById.Response, ({ id, ...query }) => this.get(`/tags/${encodeURIComponent(id)}/related-tags/tags`, query)),
        getRelatedBySlug: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Tags.GetRelatedBySlug.Request, domain_1.Polymarket.Gamma.API.Tags.GetRelatedBySlug.Response, ({ slug, ...query }) => this.get(`/tags/slug/${encodeURIComponent(slug)}/related-tags/tags`, query)),
    };
    series = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Series.List.Request, domain_1.Polymarket.Gamma.API.Series.List.Response, (request) => this.get("/series", request)),
        getById: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Series.GetById.Request, domain_1.Polymarket.Gamma.API.Series.GetById.Response, ({ id, ...query }) => this.get(`/series/${encodeURIComponent(id)}`, query)),
    };
    comments = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Comments.List.Request, domain_1.Polymarket.Gamma.API.Comments.List.Response, (request) => this.get("/comments", request)),
        getById: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Comments.GetById.Request, domain_1.Polymarket.Gamma.API.Comments.GetById.Response, ({ id, ...query }) => this.get(`/comments/${encodeURIComponent(id)}`, query)),
        getByUserAddress: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Comments.GetByUserAddress.Request, domain_1.Polymarket.Gamma.API.Comments.GetByUserAddress.Response, ({ user_address, ...query }) => this.get(`/comments/user_address/${encodeURIComponent(user_address)}`, query)),
    };
    profiles = {
        getPublic: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Profiles.GetPublic.Request, domain_1.Polymarket.Gamma.API.Profiles.GetPublic.Response, (request) => this.get("/public-profile", request)),
    };
    search = {
        public: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Search.Public.Request, domain_1.Polymarket.Gamma.API.Search.Public.Response, (request) => this.get("/public-search", request)),
    };
    sports = {
        list: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Sports.List.Request, domain_1.Polymarket.Gamma.API.Sports.List.Response, () => this.get("/sports")),
        listMarketTypes: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Sports.ListMarketTypes.Request, domain_1.Polymarket.Gamma.API.Sports.ListMarketTypes.Response, () => this.get("/sports/market-types")),
        listTeams: (0, utils_1.withAPIParsing)(domain_1.Polymarket.Gamma.API.Sports.ListTeams.Request, domain_1.Polymarket.Gamma.API.Sports.ListTeams.Response, (request) => this.get("/teams", request)),
    };
}
exports.PolymarketGammaClient = PolymarketGammaClient;
