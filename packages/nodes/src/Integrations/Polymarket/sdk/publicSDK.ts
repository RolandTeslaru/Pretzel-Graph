import type { HTTP } from "@pretzel-graph/node-sdk"

import {
    PolymarketDataClient,
    PolymarketGammaClient,
    PolymarketUnauthenticatedCLOBClient,
} from "../client"
import { Polymarket } from "../domain"


/**
 * Everything Polymarket exposes without a credential, in our own terms.
 *
 * Polymarket answers on three APIs — Gamma for metadata, CLOB for the exchange, Data for
 * analytics — and which one owns a given fact is infrastructure. This is the seam: callers ask for
 * a market, an event, a wallet's positions; the routing and the wire shapes stop here, and
 * everything above speaks `Polymarket.Market`, `Polymarket.Event`, `Polymarket.Activity`.
 *
 * Split by credential rather than by node, so capability is enforced by construction: this class
 * has no method that could place an order because it holds nothing that could sign one.
 */
export class PolymarketPublicSDK {

    readonly #gamma: PolymarketGammaClient
    readonly #clob:  PolymarketUnauthenticatedCLOBClient
    readonly #data:  PolymarketDataClient

    constructor(http: HTTP.ClientAPI) {
        this.#gamma = new PolymarketGammaClient(http)
        this.#clob  = new PolymarketUnauthenticatedCLOBClient(http)
        this.#data  = new PolymarketDataClient(http)
    }


    // Gamma addresses markets, events and tags by numeric id or by slug, on different endpoints.
    // Deciding which from the shape of the value belongs here, not in every caller.
    static #looksNumeric = (value: string) => /^\d+$/.test(value)

    static #required = (value: string | undefined, name: string) => {
        const text = (value ?? "").trim()

        if (!text)
            throw new Error(`Polymarket: '${name}' is required.`)

        return text
    }


    public readonly markets = {
        /**
         * Search through Gamma's own index.
         *
         * `/public-search` answers with events, so the markets are flattened out of them, deduped,
         * and ranked by how many query terms each market's own text matches — otherwise a search
         * for "marco rubio 2028" returns whichever market beside his happens to be biggest.
         */
        search: async (args: {
            query?: string
            status?: Polymarket.Market.Status
            limit?:  number
        }): Promise<Polymarket.Market.Meta[]> => {

            const status = args.status ?? "active"
            const limit  = args.limit  ?? 20
            const query  = (args.query ?? "").trim()

            if (!query)
                return this.markets.list({ status, limit })

            const results = await this.#gamma.search.public({
                q:              query,
                limit_per_type: Math.min(Math.max(limit, 20), 500),
            })

            const markets = (results.events ?? []).flatMap(event =>
                (event.markets ?? []).map(market => ({
                    ...Polymarket.Market.Meta.fromGamma(market),
                    eventId:   event.id   ?? null,
                    eventSlug: event.slug ?? null,
                })))

            const unique = new Map(markets.map(market =>
                [market.conditionId ?? market.id ?? JSON.stringify(market), market]))

            const terms = query.toLowerCase().split(/\s+/).filter(Boolean)

            const relevance = (market: Polymarket.Market.Meta) => {
                const text = `${market.question ?? ""} ${market.slug ?? ""} ${market.groupItemTitle ?? ""}`
                    .toLowerCase()

                return terms.filter(term => text.includes(term)).length
            }

            return [...unique.values()]
                .filter(market => Polymarket.Market.matchesStatus(market, status))
                .sort((left, right) =>
                    relevance(right) - relevance(left)
                    || (right.volume ?? 0) - (left.volume ?? 0))
                .slice(0, limit)
        },

        /**
         * Markets by volume, highest first.
         *
         * "all" isn't a filter Gamma can express — it has independent `active` and `closed`
         * booleans — so it costs two requests and a merge, and the union has to be re-sorted
         * rather than trusting either page's ordering.
         */
        list: async (args: {
            status?: Polymarket.Market.Status
            limit?:  number
        } = {}): Promise<Polymarket.Market.Meta[]> => {

            const status  = args.status ?? "active"
            const limit   = args.limit  ?? 20
            const request = { limit, order: "volume", ascending: false } as const

            const markets = status === "all"
                ? (await Promise.all([
                    this.#gamma.markets.list({ ...request, active: true, closed: false }),
                    this.#gamma.markets.list({ ...request, closed: true }),
                ])).flat()
                : await this.#gamma.markets.list({ ...request, ...Polymarket.Market.statusQuery(status) })

            const unique = new Map(markets.map(market =>
                [market.id ?? market.slug ?? JSON.stringify(market), Polymarket.Market.Meta.fromGamma(market)]))

            return [...unique.values()]
                .sort((left, right) => (right.volume ?? 0) - (left.volume ?? 0))
                .slice(0, limit)
        },

        /** One market in full, by numeric id or slug. */
        get: async (identifier: string): Promise<Polymarket.Market> => {
            const key = PolymarketPublicSDK.#required(identifier, "identifier")

            const market = PolymarketPublicSDK.#looksNumeric(key)
                ? await this.#gamma.markets.getById({ id: Polymarket.Gamma.Market.Id.parse(key) })
                : await this.#gamma.markets.getBySlug({ slug: key })

            return Polymarket.Market.fromGamma(market)
        },

        stats: async (identifier: string): Promise<Polymarket.MarketStats> => {
            const key = PolymarketPublicSDK.#required(identifier, "identifier")

            const market = PolymarketPublicSDK.#looksNumeric(key)
                ? await this.#gamma.markets.getById({ id: Polymarket.Gamma.Market.Id.parse(key) })
                : await this.#gamma.markets.getBySlug({ slug: key })

            return Polymarket.MarketStats.fromGamma(market)
        },

        /** Exchange configuration — tick size, fees, rewards. CLOB's copy, which is authoritative. */
        config: (conditionId: string) =>
            this.#clob.markets.getClobInfo({
                condition_id: PolymarketPublicSDK.#required(conditionId, "conditionId"),
            }),

        rewards: (conditionId: string) =>
            this.#clob.rewards.getMarket({
                condition_id: PolymarketPublicSDK.#required(conditionId, "conditionId"),
            }),
    }


    public readonly events = {
        list: async (args: {
            status?: Polymarket.Market.Status
            limit?:  number
        } = {}): Promise<Polymarket.Event.Meta[]> => {

            const events = await this.#gamma.events.list({
                ...Polymarket.Market.statusQuery(args.status ?? "active"),
                limit:     args.limit ?? 20,
                order:     "volume",
                ascending: false,
            })

            return events.map(Polymarket.Event.Meta.fromGamma)
        },

        /** One event with its live markets as references. */
        get: async (identifier: string): Promise<Polymarket.Event> => {
            const key = PolymarketPublicSDK.#required(identifier, "identifier")

            const event = PolymarketPublicSDK.#looksNumeric(key)
                ? await this.#gamma.events.getById({ id: Polymarket.Gamma.Event.Id.parse(key) })
                : await this.#gamma.events.getBySlug({ slug: key })

            return Polymarket.Event.fromGamma(event)
        },

        stats: async (identifier: string): Promise<Polymarket.EventStats> => {
            const key = PolymarketPublicSDK.#required(identifier, "identifier")

            const event = PolymarketPublicSDK.#looksNumeric(key)
                ? await this.#gamma.events.getById({ id: Polymarket.Gamma.Event.Id.parse(key) })
                : await this.#gamma.events.getBySlug({ slug: key })

            return Polymarket.EventStats.fromGamma(event)
        },
    }


    public readonly series = {
        list: async (args: { slug?: string; limit?: number } = {}): Promise<Polymarket.Series.Meta[]> => {
            const slug = (args.slug ?? "").trim()

            const series = await this.#gamma.series.list({
                limit: args.limit ?? 20,
                slug:  slug ? [slug] : undefined,
            })

            return series.map(Polymarket.Series.Meta.fromGamma)
        },

        /** Series are addressable by id only — use `list` with a slug to find one. */
        get: async (seriesId: string): Promise<Polymarket.Series> => {
            const series = await this.#gamma.series.getById({
                id: Polymarket.Gamma.Series.Id.parse(PolymarketPublicSDK.#required(seriesId, "seriesId")),
            })

            return Polymarket.Series.fromGamma(series)
        },
    }


    public readonly tags = {
        list: async (limit = 20): Promise<Polymarket.Tag[]> =>
            (await this.#gamma.tags.list({ limit })).map(Polymarket.Tag.fromGamma),

        get: async (identifier: string): Promise<Polymarket.Tag> => {
            const key = PolymarketPublicSDK.#required(identifier, "identifier")

            const tag = PolymarketPublicSDK.#looksNumeric(key)
                ? await this.#gamma.tags.getById({ id: Polymarket.Gamma.Tag.Id.parse(key) })
                : await this.#gamma.tags.getBySlug({ slug: key })

            return Polymarket.Tag.fromGamma(tag)
        },
    }


    public readonly sports = {
        list: async (): Promise<Polymarket.Sport[]> =>
            (await this.#gamma.sports.list({})).map(Polymarket.Sport.fromGamma),

        teams: async (args: { name?: string; limit?: number } = {}): Promise<Polymarket.Team[]> => {
            const name = (args.name ?? "").trim()

            const teams = await this.#gamma.sports.listTeams({
                limit: args.limit ?? 20,
                name:  name ? [name] : undefined,
            })

            return teams.map(Polymarket.Team.fromGamma)
        },
    }


    public readonly prices = {
        /** One reading for one outcome token. */
        get: async (args: {
            tokenId: string
            kind?:   "midpoint" | "buy" | "sell" | "last" | "spread"
        }) => {
            const token_id = PolymarketPublicSDK.#required(args.tokenId, "tokenId")

            switch (args.kind ?? "midpoint") {
                case "midpoint": return this.#clob.marketData.getMidpoint({ token_id })
                case "spread":   return this.#clob.marketData.getSpread({ token_id })
                case "last":     return this.#clob.marketData.getLastTradePrice({ token_id })
                default:         return this.#clob.marketData.getPrice({
                    token_id,
                    side: Polymarket.CLOB.Common.Side.parse(args.kind === "buy" ? "BUY" : "SELL"),
                })
            }
        },

        book: async (args: { tokenId: string; depth?: number }): Promise<Polymarket.OrderBook> => {
            const book = await this.#clob.marketData.getOrderBook({
                token_id: PolymarketPublicSDK.#required(args.tokenId, "tokenId"),
            })

            return Polymarket.OrderBook.fromCLOB(book, args.depth)
        },

        history: (args: {
            tokenId:   string
            interval?: "1h" | "6h" | "1d" | "1w" | "max"
            fidelity?: number
        }) =>
            this.#clob.marketData.getPriceHistory({
                market:   PolymarketPublicSDK.#required(args.tokenId, "tokenId"),
                interval: Polymarket.CLOB.Common.PriceHistoryInterval.parse(args.interval ?? "1d"),
                fidelity: args.fidelity ?? 60,
            }),

        /** Tick size, fee rate and neg-risk for one token, in one call. */
        mechanics: async (tokenId: string) => {
            const token_id = PolymarketPublicSDK.#required(tokenId, "tokenId")

            const [tickSize, negRisk, feeRate, feeExponent] = await Promise.all([
                this.#clob.marketData.getTickSize({ token_id }),
                this.#clob.marketData.getNegRisk({ token_id }),
                this.#clob.marketData.getFeeRate({ token_id }),
                this.#clob.marketData.getFeeExponent({ token_id }),
            ])

            return { tokenId: token_id, tickSize, negRisk, feeRate, feeExponent }
        },
    }


    public readonly trades = {
        /** A market's public fills, as activity of type TRADE. */
        forMarket: async (args: {
            conditionId: string
            side?:       "BUY" | "SELL"
            limit?:      number
        }): Promise<Polymarket.Activity[]> => {

            const trades = await this.#data.trades.list({
                market: [Polymarket.Data.Common.ConditionId.parse(
                    PolymarketPublicSDK.#required(args.conditionId, "conditionId"))],
                limit: args.limit ?? 100,
                side:  args.side ? Polymarket.Data.Common.Side.parse(args.side) : undefined,
            })

            return trades.map(Polymarket.Activity.fromTrade)
        },
    }


    public readonly holders = {
        forMarket: async (args: { conditionId: string; limit?: number }): Promise<Polymarket.Holder.Side[]> => {
            const holders = await this.#data.markets.listHolders({
                market: [Polymarket.Data.Common.ConditionId.parse(
                    PolymarketPublicSDK.#required(args.conditionId, "conditionId"))],
                limit: args.limit ?? 20,
            })

            return holders.map(Polymarket.Holder.Side.fromData)
        },
    }


    /** Any wallet's public history. Keyed by address, so none of this needs a credential. */
    public readonly wallets = {
        positions: async (args: {
            wallet:          string
            limit?:          number
            sortBy?:         Parameters<PolymarketDataClient["positions"]["listCurrent"]>[0] extends { sortBy?: infer S } ? S : never
            direction?:      "ASC" | "DESC"
            redeemableOnly?: boolean
        }): Promise<Polymarket.Position[]> => {

            const positions = await this.#data.positions.listCurrent({
                user:          Polymarket.Data.Common.WalletAddress.parse(args.wallet),
                limit:         args.limit ?? 100,
                sortBy:        args.sortBy,
                sortDirection: args.direction,
                redeemable:    args.redeemableOnly,
            })

            return positions.map(Polymarket.Position.fromData)
        },

        closedPositions: async (args: {
            wallet:     string
            limit?:     number
            sortBy?:    "REALIZEDPNL" | "TIMESTAMP" | "PRICE" | "AVGPRICE" | "TITLE"
            direction?: "ASC" | "DESC"
        }): Promise<Polymarket.Position.Closed[]> => {

            const positions = await this.#data.positions.listClosed({
                user:          Polymarket.Data.Common.WalletAddress.parse(args.wallet),
                limit:         args.limit ?? 10,
                sortBy:        args.sortBy,
                sortDirection: args.direction,
            })

            return positions.map(Polymarket.Position.Closed.fromData)
        },

        activity: async (args: {
            wallet:     string
            limit?:     number
            type?:      string
            direction?: "ASC" | "DESC"
        }): Promise<Polymarket.Activity[]> => {

            const activity = await this.#data.activity.list({
                user:  Polymarket.Data.Common.WalletAddress.parse(args.wallet),
                limit: args.limit ?? 100,
                type:  args.type && args.type !== "ALL"
                    ? [Polymarket.Data.Activity.Type.parse(args.type)]
                    : undefined,
                sortDirection: args.direction,
            })

            return activity.map(Polymarket.Activity.fromData)
        },

        value: (wallet: string) =>
            this.#data.users.getValue({ user: Polymarket.Data.Common.WalletAddress.parse(wallet) }),

        tradedMarkets: (wallet: string) =>
            this.#data.users.getTradedMarketCount({
                user: Polymarket.Data.Common.WalletAddress.parse(wallet),
            }),

        rank: (args: {
            wallet:    string
            period?:   "DAY" | "WEEK" | "MONTH" | "ALL"
            rankedBy?: "PNL" | "VOL"
            limit?:    number
        }) =>
            this.#data.leaderboard.list({
                user:       Polymarket.Data.Common.WalletAddress.parse(args.wallet),
                timePeriod: args.period,
                orderBy:    args.rankedBy,
                limit:      args.limit ?? 25,
            }),

        /** The public profile behind an address — name, pseudonym, bio, badges. */
        identity: (wallet: string) =>
            this.#gamma.profiles.getPublic({
                address: Polymarket.Gamma.Common.WalletAddress.parse(wallet),
            }),
    }


    public readonly stats = {
        openInterest: (conditionId: string) =>
            this.#data.markets.getOpenInterest({
                market: [Polymarket.Data.Common.ConditionId.parse(
                    PolymarketPublicSDK.#required(conditionId, "conditionId"))],
            }),

        liveVolume: (eventId: string) =>
            this.#data.markets.getLiveVolume({
                id: PolymarketPublicSDK.#required(eventId, "eventId"),
            }),
    }


    /** Cross-entity search: events, and optionally tags and public profiles. */
    public readonly search = {
        all: async (args: {
            query:            string
            includeTags?:     boolean
            includeProfiles?: boolean
            limit?:           number
        }) => {
            const results = await this.#gamma.search.public({
                q:               PolymarketPublicSDK.#required(args.query, "query"),
                limit_per_type:  args.limit ?? 20,
                search_tags:     args.includeTags,
                search_profiles: args.includeProfiles,
            })

            return {
                events:   (results.events ?? []).map(Polymarket.Event.Meta.fromGamma),
                tags:     (results.tags ?? []).map(Polymarket.Tag.fromGamma),
                profiles: (results.profiles ?? []).map(profile => ({
                    name:        profile.name ?? profile.pseudonym ?? null,
                    proxyWallet: profile.proxyWallet ?? null,
                    bio:         profile.bio ?? null,
                })),
                pagination: results.pagination,
            }
        },
    }
}
