"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const client_1 = require("../client");
const domain_1 = require("../domain");
const sdk_1 = require("../sdk");
const tools_1 = require("./tools");
class Node extends node_sdk_1.RuntimeNode {
    async onRun() {
        const fields = this.fieldValues;
        const polymarket = this.polymarket;
        // defineTool is terminal and total-replacing, so tool mode is a disjoint arm — none of the
        // Run-mode fields exist here after derivative resolution. One entry point.
        if (fields.isConvertedToTool === true)
            return (0, tools_1.buildTools)(polymarket);
        if (fields.action === "search") {
            if (fields.searchKind === "markets")
                return {
                    markets: await polymarket.markets.search({
                        query: fields.searchMarketsQuery,
                        status: fields.searchMarketsStatus,
                        limit: fields.searchMarketsMaxResults,
                    }),
                };
            return {
                results: await polymarket.search.all({
                    query: fields.publicSearchQuery,
                    includeTags: fields.publicSearchSearchTags,
                    includeProfiles: fields.publicSearchSearchProfiles,
                    limit: fields.publicSearchMaxResults,
                }),
            };
        }
        if (fields.action === "list")
            switch (fields.listResource) {
                case "markets":
                    return {
                        markets: await polymarket.markets.list({
                            status: fields.listMarketsStatus,
                            limit: fields.listMarketsMaxResults,
                        }),
                    };
                case "events":
                    return {
                        events: await polymarket.events.list({
                            status: fields.listEventsStatus,
                            limit: fields.listEventsMaxResults,
                        }),
                    };
                case "series":
                    return {
                        series: await polymarket.series.list({
                            slug: fields.listSeriesSlug,
                            limit: fields.listSeriesMaxResults,
                        }),
                    };
                case "tags":
                    return {
                        tags: await polymarket.tags.list(fields.listTagsMaxResults),
                    };
                case "sports":
                    return {
                        sports: await polymarket.sports.list(),
                    };
                case "teams":
                    return {
                        teams: await polymarket.sports.teams({
                            name: fields.listTeamsName,
                            limit: fields.listTeamsMaxResults,
                        }),
                    };
                // The one operation still on a raw client. Comments are deliberately absent from
                // the SDK so that nothing composing it — the tool node above all — can pull
                // untrusted user text into an agent's context.
                case "comments":
                    return {
                        comments: await this.gammaClient.comments.list({
                            parent_entity_type: domain_1.Polymarket.Gamma.Comment.ParentEntityType.parse(fields.listCommentsParentEntityType),
                            parent_entity_id: fields.listCommentsParentId,
                            get_positions: fields.listCommentsGetPositions,
                            holders_only: fields.listCommentsHoldersOnly,
                            limit: fields.listCommentsMaxResults,
                        }),
                    };
                case "trades":
                    return {
                        trades: await polymarket.trades.forMarket({
                            conditionId: fields.listTradesConditionId,
                            side: fields.listTradesSide === "all" ? undefined : fields.listTradesSide,
                            limit: fields.listTradesMaxResults,
                        }),
                    };
                case "holders":
                    return {
                        holders: await polymarket.holders.forMarket({
                            conditionId: fields.listHoldersConditionId,
                            limit: fields.listHoldersMaxResults,
                        }),
                    };
            }
        switch (fields.getResource) {
            case "market":
                return {
                    market: await polymarket.markets.get(fields.getMarketIdentifier),
                };
            case "marketStats":
                return {
                    stats: await polymarket.markets.stats(fields.getMarketStatsIdentifier),
                };
            case "event":
                return {
                    event: await polymarket.events.get(fields.getEventIdentifier),
                };
            case "eventStats":
                return {
                    stats: await polymarket.events.stats(fields.getEventStatsIdentifier),
                };
            case "series":
                return {
                    series: await polymarket.series.get(fields.getSeriesIdentifier),
                };
            case "tag":
                return {
                    tag: await polymarket.tags.get(fields.getTagIdentifier),
                };
            case "price":
                return {
                    price: await polymarket.prices.get({
                        tokenId: fields.getPriceTokenId,
                        kind: fields.getPriceKind,
                    }),
                };
            case "orderBook":
                return {
                    orderBook: await polymarket.prices.book({
                        tokenId: fields.getOrderBookTokenId,
                        depth: fields.getOrderBookDepth,
                    }),
                };
            case "priceHistory":
                return {
                    history: await polymarket.prices.history({
                        tokenId: fields.getPriceHistoryTokenId,
                        interval: fields.getPriceHistoryInterval,
                        fidelity: fields.getPriceHistoryFidelity,
                        points: fields.getPriceHistoryPoints,
                    }),
                };
            case "mechanics":
                return {
                    mechanics: await polymarket.prices.mechanics(fields.getMarketMechanicsTokenId),
                };
            case "marketConfig":
                return {
                    market: await polymarket.markets.config(fields.getClobMarketConditionId),
                };
            case "rewards":
                return {
                    rewards: await polymarket.markets.rewards(fields.getMarketRewardsConditionId),
                };
            case "openInterest":
                return {
                    openInterest: await polymarket.stats.openInterest(fields.getOpenInterestConditionId),
                };
        }
        return {
            volume: await polymarket.stats.liveVolume(fields.getLiveVolumeEventId),
        };
    }
    polymarket;
    gammaClient;
    constructor(nodeId, context) {
        super(nodeId, context);
        this.polymarket = new sdk_1.PolymarketPublicSDK(this.httpClientFactory);
        this.gammaClient = new client_1.PolymarketGammaClient(this.httpClientFactory);
    }
}
exports.Node = Node;
