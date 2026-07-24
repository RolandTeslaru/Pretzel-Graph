import type { HTTP } from "@pretzel-graph/node-sdk"

import { withAPIParsing } from "../../../utils"
import { Polymarket } from "../domain"

export const POLYMARKET_GAMMA_BASE_URL = "https://gamma-api.polymarket.com"

export class PolymarketGammaClient {
    readonly #client: HTTP.Client

    constructor(http: HTTP.ClientAPI) {
        this.#client = http.create({
            vendor:  "Polymarket",
            baseURL: POLYMARKET_GAMMA_BASE_URL,
            headers: { "User-Agent": "PretzelGraph/1.0" },
            // Gamma arrays use repeated keys: ?id=1&id=2.
            paramsSerializer: { indexes: null },
        })
    }

    private async get(path: string, params?: object): Promise<unknown> {
        return this.#client.get<unknown>(path, { params })
    }

    public readonly status = {
        get: withAPIParsing(
            Polymarket.Gamma.API.Status.Get.Request,
            Polymarket.Gamma.API.Status.Get.Response,
            () => this.get("/status"),
        ),
    }

    public readonly events = {
        list: withAPIParsing(
            Polymarket.Gamma.API.Events.List.Request,
            Polymarket.Gamma.API.Events.List.Response,
            (request) => this.get("/events", request),
        ),

        listKeyset: withAPIParsing(
            Polymarket.Gamma.API.Events.ListKeyset.Request,
            Polymarket.Gamma.API.Events.ListKeyset.Response,
            (request) => this.get("/events/keyset", request),
        ),

        getById: withAPIParsing(
            Polymarket.Gamma.API.Events.GetById.Request,
            Polymarket.Gamma.API.Events.GetById.Response,
            ({ id, ...query }) =>
                this.get(`/events/${encodeURIComponent(id)}`, query),
        ),

        getBySlug: withAPIParsing(
            Polymarket.Gamma.API.Events.GetBySlug.Request,
            Polymarket.Gamma.API.Events.GetBySlug.Response,
            ({ slug, ...query }) =>
                this.get(`/events/slug/${encodeURIComponent(slug)}`, query),
        ),

        getTags: withAPIParsing(
            Polymarket.Gamma.API.Events.GetTags.Request,
            Polymarket.Gamma.API.Events.GetTags.Response,
            ({ id }) =>
                this.get(`/events/${encodeURIComponent(id)}/tags`),
        ),
    }

    public readonly markets = {
        list: withAPIParsing(
            Polymarket.Gamma.API.Markets.List.Request,
            Polymarket.Gamma.API.Markets.List.Response,
            (request) => this.get("/markets", request),
        ),

        listKeyset: withAPIParsing(
            Polymarket.Gamma.API.Markets.ListKeyset.Request,
            Polymarket.Gamma.API.Markets.ListKeyset.Response,
            (request) => this.get("/markets/keyset", request),
        ),

        getById: withAPIParsing(
            Polymarket.Gamma.API.Markets.GetById.Request,
            Polymarket.Gamma.API.Markets.GetById.Response,
            ({ id, ...query }) =>
                this.get(`/markets/${encodeURIComponent(id)}`, query),
        ),

        getBySlug: withAPIParsing(
            Polymarket.Gamma.API.Markets.GetBySlug.Request,
            Polymarket.Gamma.API.Markets.GetBySlug.Response,
            ({ slug, ...query }) =>
                this.get(`/markets/slug/${encodeURIComponent(slug)}`, query),
        ),

        getTags: withAPIParsing(
            Polymarket.Gamma.API.Markets.GetTags.Request,
            Polymarket.Gamma.API.Markets.GetTags.Response,
            ({ id }) =>
                this.get(`/markets/${encodeURIComponent(id)}/tags`),
        ),
    }

    public readonly tags = {
        list: withAPIParsing(
            Polymarket.Gamma.API.Tags.List.Request,
            Polymarket.Gamma.API.Tags.List.Response,
            (request) => this.get("/tags", request),
        ),

        getById: withAPIParsing(
            Polymarket.Gamma.API.Tags.GetById.Request,
            Polymarket.Gamma.API.Tags.GetById.Response,
            ({ id, ...query }) =>
                this.get(`/tags/${encodeURIComponent(id)}`, query),
        ),

        getBySlug: withAPIParsing(
            Polymarket.Gamma.API.Tags.GetBySlug.Request,
            Polymarket.Gamma.API.Tags.GetBySlug.Response,
            ({ slug, ...query }) =>
                this.get(`/tags/slug/${encodeURIComponent(slug)}`, query),
        ),

        getRelationshipsById: withAPIParsing(
            Polymarket.Gamma.API.Tags.GetRelationshipsById.Request,
            Polymarket.Gamma.API.Tags.GetRelationshipsById.Response,
            ({ id, ...query }) =>
                this.get(
                    `/tags/${encodeURIComponent(id)}/related-tags`,
                    query,
                ),
        ),

        getRelationshipsBySlug: withAPIParsing(
            Polymarket.Gamma.API.Tags.GetRelationshipsBySlug.Request,
            Polymarket.Gamma.API.Tags.GetRelationshipsBySlug.Response,
            ({ slug, ...query }) =>
                this.get(
                    `/tags/slug/${encodeURIComponent(slug)}/related-tags`,
                    query,
                ),
        ),

        getRelatedById: withAPIParsing(
            Polymarket.Gamma.API.Tags.GetRelatedById.Request,
            Polymarket.Gamma.API.Tags.GetRelatedById.Response,
            ({ id, ...query }) =>
                this.get(
                    `/tags/${encodeURIComponent(id)}/related-tags/tags`,
                    query,
                ),
        ),

        getRelatedBySlug: withAPIParsing(
            Polymarket.Gamma.API.Tags.GetRelatedBySlug.Request,
            Polymarket.Gamma.API.Tags.GetRelatedBySlug.Response,
            ({ slug, ...query }) =>
                this.get(
                    `/tags/slug/${encodeURIComponent(slug)}/related-tags/tags`,
                    query,
                ),
        ),
    }

    public readonly series = {
        list: withAPIParsing(
            Polymarket.Gamma.API.Series.List.Request,
            Polymarket.Gamma.API.Series.List.Response,
            (request) => this.get("/series", request),
        ),

        getById: withAPIParsing(
            Polymarket.Gamma.API.Series.GetById.Request,
            Polymarket.Gamma.API.Series.GetById.Response,
            ({ id, ...query }) =>
                this.get(`/series/${encodeURIComponent(id)}`, query),
        ),
    }

    public readonly comments = {
        list: withAPIParsing(
            Polymarket.Gamma.API.Comments.List.Request,
            Polymarket.Gamma.API.Comments.List.Response,
            (request) => this.get("/comments", request),
        ),

        getById: withAPIParsing(
            Polymarket.Gamma.API.Comments.GetById.Request,
            Polymarket.Gamma.API.Comments.GetById.Response,
            ({ id, ...query }) =>
                this.get(`/comments/${encodeURIComponent(id)}`, query),
        ),

        getByUserAddress: withAPIParsing(
            Polymarket.Gamma.API.Comments.GetByUserAddress.Request,
            Polymarket.Gamma.API.Comments.GetByUserAddress.Response,
            ({ user_address, ...query }) =>
                this.get(
                    `/comments/user_address/${encodeURIComponent(user_address)}`,
                    query,
                ),
        ),
    }

    public readonly profiles = {
        getPublic: withAPIParsing(
            Polymarket.Gamma.API.Profiles.GetPublic.Request,
            Polymarket.Gamma.API.Profiles.GetPublic.Response,
            (request) => this.get("/public-profile", request),
        ),
    }

    public readonly search = {
        public: withAPIParsing(
            Polymarket.Gamma.API.Search.Public.Request,
            Polymarket.Gamma.API.Search.Public.Response,
            (request) => this.get("/public-search", request),
        ),
    }

    public readonly sports = {
        list: withAPIParsing(
            Polymarket.Gamma.API.Sports.List.Request,
            Polymarket.Gamma.API.Sports.List.Response,
            () => this.get("/sports"),
        ),

        listMarketTypes: withAPIParsing(
            Polymarket.Gamma.API.Sports.ListMarketTypes.Request,
            Polymarket.Gamma.API.Sports.ListMarketTypes.Response,
            () => this.get("/sports/market-types"),
        ),

        listTeams: withAPIParsing(
            Polymarket.Gamma.API.Sports.ListTeams.Request,
            Polymarket.Gamma.API.Sports.ListTeams.Response,
            (request) => this.get("/teams", request),
        ),
    }
}
