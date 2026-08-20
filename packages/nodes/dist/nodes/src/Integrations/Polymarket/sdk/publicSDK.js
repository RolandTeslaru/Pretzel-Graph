"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketPublicSDK = void 0;
const client_1 = require("../client");
const domain_1 = require("../domain");
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
class PolymarketPublicSDK {
    #gamma;
    #clob;
    #data;
    constructor(http) {
        this.#gamma = new client_1.PolymarketGammaClient(http);
        this.#clob = new client_1.PolymarketUnauthenticatedCLOBClient(http);
        this.#data = new client_1.PolymarketDataClient(http);
    }
    // Gamma addresses markets, events and tags by numeric id or by slug, on different endpoints.
    // Deciding which from the shape of the value belongs here, not in every caller.
    static #looksNumeric = (value) => /^\d+$/.test(value);
    /**
     * A 404 that means "there is no such thing", as opposed to a failure.
     *
     * Matches both shapes: HTTP.Error carries `.status`, and a bare axios error carries
     * `.response.status` — the sample script builds clients without the worker's wrapper.
     */
    static #isNotFound = (error) => {
        const candidate = error;
        return candidate?.status === 404 || candidate?.response?.status === 404;
    };
    static #required = (value, name) => {
        const text = (value ?? "").trim();
        if (!text)
            throw new Error(`Polymarket: '${name}' is required.`);
        return text;
    };
    /**
     * One market, by id or slug, with its parent event attached.
     *
     * `/markets/{id}` is the obvious endpoint and the wrong one: it omits `events[]`, so every
     * market fetched that way came back claiming no parent. The list form carries it, at the cost
     * of a `closed` filter that defaults to false server-side and silently answers `[]` for
     * anything resolved — hence the second attempt.
     */
    async #market(identifier) {
        const key = _a.#required(identifier, "identifier");
        const query = _a.#looksNumeric(key)
            ? { id: [domain_1.Polymarket.Gamma.Market.Id.parse(key)] }
            : { slug: [key] };
        const [open] = await this.#gamma.markets.list({ ...query, closed: false });
        if (open)
            return open;
        const [resolved] = await this.#gamma.markets.list({ ...query, closed: true });
        if (resolved)
            return resolved;
        throw new Error(`Polymarket: no market matching '${key}'.`);
    }
    /** The market an outcome token belongs to, or null. What makes a price series identifiable. */
    async #marketByToken(tokenId) {
        const query = { clob_token_ids: [domain_1.Polymarket.Gamma.Market.TokenId.parse(tokenId)] };
        const [open] = await this.#gamma.markets.list({ ...query, closed: false });
        if (open)
            return open;
        const [resolved] = await this.#gamma.markets.list({ ...query, closed: true });
        return resolved ?? null;
    }
    markets = {
        /**
         * Search through Gamma's own index.
         *
         * `/public-search` answers with events, so the markets are flattened out of them, deduped,
         * and ranked by how many query terms each market's own text matches — otherwise a search
         * for "marco rubio 2028" returns whichever market beside his happens to be biggest.
         */
        search: async (args) => {
            const status = args.status ?? "active";
            const limit = args.limit ?? 20;
            const query = (args.query ?? "").trim();
            if (!query)
                return this.markets.list({ status, limit });
            const results = await this.#gamma.search.public({
                q: query,
                limit_per_type: Math.min(Math.max(limit, 20), 500),
            });
            const markets = (results.events ?? []).flatMap(event => (event.markets ?? []).map(market => ({
                ...domain_1.Polymarket.Market.Meta.fromGamma(market),
                eventId: event.id ?? null,
                eventSlug: event.slug ?? null,
            })));
            const unique = new Map(markets.map(market => [market.conditionId ?? market.id ?? JSON.stringify(market), market]));
            const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
            const relevance = (market) => {
                const text = `${market.question ?? ""} ${market.slug ?? ""} ${market.groupItemTitle ?? ""}`
                    .toLowerCase();
                return terms.filter(term => text.includes(term)).length;
            };
            return [...unique.values()]
                .filter(market => domain_1.Polymarket.Market.matchesStatus(market, status))
                .sort((left, right) => relevance(right) - relevance(left)
                || (right.volume ?? 0) - (left.volume ?? 0))
                .slice(0, limit);
        },
        /**
         * Markets by volume, highest first.
         *
         * "all" isn't a filter Gamma can express — it has independent `active` and `closed`
         * booleans — so it costs two requests and a merge, and the union has to be re-sorted
         * rather than trusting either page's ordering.
         */
        list: async (args = {}) => {
            const status = args.status ?? "active";
            const limit = args.limit ?? 20;
            const request = { limit, order: "volume", ascending: false };
            const markets = status === "all"
                ? (await Promise.all([
                    this.#gamma.markets.list({ ...request, active: true, closed: false }),
                    this.#gamma.markets.list({ ...request, closed: true }),
                ])).flat()
                : await this.#gamma.markets.list({ ...request, ...domain_1.Polymarket.Market.statusQuery(status) });
            const unique = new Map(markets.map(market => [market.id ?? market.slug ?? JSON.stringify(market), domain_1.Polymarket.Market.Meta.fromGamma(market)]));
            return [...unique.values()]
                .sort((left, right) => (right.volume ?? 0) - (left.volume ?? 0))
                .slice(0, limit);
        },
        /** One market in full, by numeric id or slug. */
        get: async (identifier) => domain_1.Polymarket.Market.fromGamma(await this.#market(identifier)),
        stats: async (identifier) => domain_1.Polymarket.MarketStats.fromGamma(await this.#market(identifier)),
        /** Exchange configuration — tick size, fees, rewards. CLOB's copy, which is authoritative. */
        config: (conditionId) => this.#clob.markets.getClobInfo({
            condition_id: _a.#required(conditionId, "conditionId"),
        }),
        rewards: (conditionId) => this.#clob.rewards.getMarket({
            condition_id: _a.#required(conditionId, "conditionId"),
        }),
    };
    events = {
        list: async (args = {}) => {
            const events = await this.#gamma.events.list({
                ...domain_1.Polymarket.Market.statusQuery(args.status ?? "active"),
                limit: args.limit ?? 20,
                order: "volume",
                ascending: false,
            });
            return events.map(domain_1.Polymarket.Event.Meta.fromGamma);
        },
        /** One event with its live markets as references, longest odds first. */
        get: async (identifier, options = {}) => {
            const key = _a.#required(identifier, "identifier");
            const event = _a.#looksNumeric(key)
                ? await this.#gamma.events.getById({ id: domain_1.Polymarket.Gamma.Event.Id.parse(key) })
                : await this.#gamma.events.getBySlug({ slug: key });
            return domain_1.Polymarket.Event.fromGamma(event, options);
        },
        stats: async (identifier) => {
            const key = _a.#required(identifier, "identifier");
            const event = _a.#looksNumeric(key)
                ? await this.#gamma.events.getById({ id: domain_1.Polymarket.Gamma.Event.Id.parse(key) })
                : await this.#gamma.events.getBySlug({ slug: key });
            return domain_1.Polymarket.EventStats.fromGamma(event);
        },
    };
    series = {
        list: async (args = {}) => {
            const slug = (args.slug ?? "").trim();
            const series = await this.#gamma.series.list({
                limit: args.limit ?? 20,
                slug: slug ? [slug] : undefined,
            });
            return series.map(domain_1.Polymarket.Series.Meta.fromGamma);
        },
        /** Series are addressable by id only — use `list` with a slug to find one. */
        get: async (seriesId) => {
            const series = await this.#gamma.series.getById({
                id: domain_1.Polymarket.Gamma.Series.Id.parse(_a.#required(seriesId, "seriesId")),
            });
            return domain_1.Polymarket.Series.fromGamma(series);
        },
    };
    tags = {
        list: async (limit = 20) => (await this.#gamma.tags.list({ limit })).map(domain_1.Polymarket.Tag.fromGamma),
        get: async (identifier) => {
            const key = _a.#required(identifier, "identifier");
            const tag = _a.#looksNumeric(key)
                ? await this.#gamma.tags.getById({ id: domain_1.Polymarket.Gamma.Tag.Id.parse(key) })
                : await this.#gamma.tags.getBySlug({ slug: key });
            return domain_1.Polymarket.Tag.fromGamma(tag);
        },
    };
    sports = {
        list: async () => (await this.#gamma.sports.list({})).map(domain_1.Polymarket.Sport.fromGamma),
        teams: async (args = {}) => {
            const name = (args.name ?? "").trim();
            const teams = await this.#gamma.sports.listTeams({
                limit: args.limit ?? 20,
                name: name ? [name] : undefined,
            });
            return teams.map(domain_1.Polymarket.Team.fromGamma);
        },
    };
    prices = {
        /** One reading for one outcome token. */
        get: async (args) => {
            const token_id = _a.#required(args.tokenId, "tokenId");
            switch (args.kind ?? "midpoint") {
                case "midpoint": return this.#clob.marketData.getMidpoint({ token_id });
                case "spread": return this.#clob.marketData.getSpread({ token_id });
                case "last": return this.#clob.marketData.getLastTradePrice({ token_id });
                default: return this.#clob.marketData.getPrice({
                    token_id,
                    side: domain_1.Polymarket.CLOB.Common.Side.parse(args.kind === "buy" ? "BUY" : "SELL"),
                });
            }
        },
        book: async (args) => {
            const book = await this.#clob.marketData.getOrderBook({
                token_id: _a.#required(args.tokenId, "tokenId"),
            });
            return domain_1.Polymarket.OrderBook.fromCLOB(book, args.depth);
        },
        /**
         * One token's price over time, with the market it belongs to resolved rather than assumed.
         *
         * The lookup is a second request, and it is the point: the CLOB's series carries nothing
         * that identifies it, so a caller holding a stale or borrowed token id gets a perfectly
         * plausible chart of something else. A failed lookup leaves the labels null and the series
         * intact — not knowing the name is no reason to withhold the prices.
         */
        history: async (args) => {
            const tokenId = _a.#required(args.tokenId, "tokenId");
            const interval = args.interval ?? "1d";
            const [series, market] = await Promise.all([
                this.#clob.marketData.getPriceHistory({
                    market: tokenId,
                    interval: domain_1.Polymarket.CLOB.Common.PriceHistoryInterval.parse(interval),
                    fidelity: args.fidelity ?? 60,
                }),
                this.#marketByToken(tokenId).catch(() => null),
            ]);
            return domain_1.Polymarket.PriceHistory.fromCLOB({
                tokenId,
                series,
                interval,
                market,
                points: args.points,
            });
        },
        /** Tick size, fee rate and neg-risk for one token, in one call. */
        mechanics: async (tokenId) => {
            const token_id = _a.#required(tokenId, "tokenId");
            const [tickSize, negRisk, feeRate, feeExponent] = await Promise.all([
                this.#clob.marketData.getTickSize({ token_id }),
                this.#clob.marketData.getNegRisk({ token_id }),
                this.#clob.marketData.getFeeRate({ token_id }),
                this.#clob.marketData.getFeeExponent({ token_id }),
            ]);
            return { tokenId: token_id, tickSize, negRisk, feeRate, feeExponent };
        },
    };
    trades = {
        /** A market's public fills, as activity of type TRADE. */
        forMarket: async (args) => {
            const trades = await this.#data.trades.list({
                market: [domain_1.Polymarket.Data.Common.ConditionId.parse(_a.#required(args.conditionId, "conditionId"))],
                limit: args.limit ?? 100,
                side: args.side ? domain_1.Polymarket.Data.Common.Side.parse(args.side) : undefined,
            });
            return trades.map(domain_1.Polymarket.Activity.fromTrade);
        },
    };
    holders = {
        forMarket: async (args) => {
            const holders = await this.#data.markets.listHolders({
                market: [domain_1.Polymarket.Data.Common.ConditionId.parse(_a.#required(args.conditionId, "conditionId"))],
                limit: args.limit ?? 20,
            });
            return holders.map(domain_1.Polymarket.Holder.Side.fromData);
        },
    };
    /** Any wallet's public history. Keyed by address, so none of this needs a credential. */
    wallets = {
        positions: async (args) => {
            const positions = await this.#data.positions.listCurrent({
                user: domain_1.Polymarket.Data.Common.WalletAddress.parse(args.wallet),
                limit: args.limit ?? 100,
                sortBy: args.sortBy,
                sortDirection: args.direction,
                redeemable: args.redeemableOnly,
                sizeThreshold: args.minSize,
            });
            return positions.map(domain_1.Polymarket.Position.fromData);
        },
        closedPositions: async (args) => {
            const positions = await this.#data.positions.listClosed({
                user: domain_1.Polymarket.Data.Common.WalletAddress.parse(args.wallet),
                limit: args.limit ?? 10,
                sortBy: args.sortBy,
                sortDirection: args.direction,
            });
            return positions.map(domain_1.Polymarket.Position.Closed.fromData);
        },
        activity: async (args) => {
            const activity = await this.#data.activity.list({
                user: domain_1.Polymarket.Data.Common.WalletAddress.parse(args.wallet),
                limit: args.limit ?? 100,
                type: args.type && args.type !== "ALL"
                    ? [domain_1.Polymarket.Data.Activity.Type.parse(args.type)]
                    : undefined,
                sortDirection: args.direction,
            });
            return activity.map(domain_1.Polymarket.Activity.fromData);
        },
        value: (wallet) => this.#data.users.getValue({ user: domain_1.Polymarket.Data.Common.WalletAddress.parse(wallet) }),
        tradedMarkets: (wallet) => this.#data.users.getTradedMarketCount({
            user: domain_1.Polymarket.Data.Common.WalletAddress.parse(wallet),
        }),
        /**
         * One wallet's standing, if it has one.
         *
         * "ALL" by default rather than Data's "DAY": a wallet outside today's top 25 answers with
         * nothing, and an empty leaderboard reads as "this address does not exist" instead of
         * "it did not place today".
         */
        rank: (args) => this.#data.leaderboard.list({
            user: domain_1.Polymarket.Data.Common.WalletAddress.parse(args.wallet),
            timePeriod: args.period ?? "ALL",
            orderBy: args.rankedBy,
            limit: 1,
        }),
        /** The top traders overall — the same endpoint with nobody in particular asked about. */
        leaderboard: (args = {}) => this.#data.leaderboard.list({
            timePeriod: args.period ?? "ALL",
            orderBy: args.rankedBy,
            limit: args.limit ?? 25,
        }),
        /**
         * The public profile behind an address — name, pseudonym, bio, badges.
         *
         * `null` when the wallet has no profile, which is an ordinary answer rather than a
         * failure: most addresses have never set one, and protocol addresses never will. Gamma
         * reports that as a 404, so without this a perfectly good "nobody has claimed this
         * address" comes back as a node error and stops the run.
         */
        identity: async (wallet) => {
            try {
                const profile = await this.#gamma.profiles.getPublic({
                    address: domain_1.Polymarket.Gamma.Common.WalletAddress.parse(wallet),
                });
                return domain_1.Polymarket.Profile.fromGamma(profile);
            }
            catch (error) {
                if (_a.#isNotFound(error))
                    return null;
                throw error;
            }
        },
    };
    stats = {
        openInterest: (conditionId) => this.#data.markets.getOpenInterest({
            market: [domain_1.Polymarket.Data.Common.ConditionId.parse(_a.#required(conditionId, "conditionId"))],
        }),
        liveVolume: (eventId) => this.#data.markets.getLiveVolume({
            id: _a.#required(eventId, "eventId"),
        }),
    };
    /** Cross-entity search: events, and optionally tags and public profiles. */
    search = {
        all: async (args) => {
            const results = await this.#gamma.search.public({
                q: _a.#required(args.query, "query"),
                limit_per_type: args.limit ?? 20,
                search_tags: args.includeTags,
                search_profiles: args.includeProfiles,
            });
            return {
                events: (results.events ?? []).map(domain_1.Polymarket.Event.Meta.fromGamma),
                tags: (results.tags ?? []).map(domain_1.Polymarket.Tag.fromGamma),
                profiles: (results.profiles ?? []).map(profile => ({
                    name: profile.name ?? profile.pseudonym ?? null,
                    proxyWallet: profile.proxyWallet ?? null,
                    bio: profile.bio ?? null,
                })),
                pagination: results.pagination,
            };
        },
    };
}
exports.PolymarketPublicSDK = PolymarketPublicSDK;
_a = PolymarketPublicSDK;
