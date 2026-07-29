import {
    RegisterNode,
    RuntimeNode,
    type InferOutputs,
} from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { PolymarketGammaClient } from "../client";
import { Polymarket } from "../domain";
import { PolymarketPublicSDK } from "../sdk";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields     = this.fieldValues;
        const polymarket = this.polymarket;

        // defineTool is terminal and total-replacing, so tool mode is a disjoint arm — none of the
        // run-mode fields exist here, and there's no reconciliation to do. One entry point.
        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(polymarket),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        if (fields.action === "search") {

            if (fields.searchKind === "markets")
                return {
                    markets: await polymarket.markets.search({
                        query:  fields.searchMarketsQuery,
                        status: fields.searchMarketsStatus,
                        limit:  fields.searchMarketsMaxResults,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            return {
                results: await polymarket.search.all({
                    query:           fields.publicSearchQuery,
                    includeTags:     fields.publicSearchSearchTags,
                    includeProfiles: fields.publicSearchSearchProfiles,
                    limit:           fields.publicSearchMaxResults,
                }),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }


        if (fields.action === "list")
            switch (fields.listResource) {

                case "markets":
                    return {
                        markets: await polymarket.markets.list({
                            status: fields.listMarketsStatus,
                            limit:  fields.listMarketsMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "events":
                    return {
                        events: await polymarket.events.list({
                            status: fields.listEventsStatus,
                            limit:  fields.listEventsMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "series":
                    return {
                        series: await polymarket.series.list({
                            slug:  fields.listSeriesSlug,
                            limit: fields.listSeriesMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "tags":
                    return {
                        tags: await polymarket.tags.list(fields.listTagsMaxResults),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "sports":
                    return {
                        sports: await polymarket.sports.list(),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "teams":
                    return {
                        teams: await polymarket.sports.teams({
                            name:  fields.listTeamsName,
                            limit: fields.listTeamsMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                // The one operation still on a raw client. Comments are deliberately absent from
                // the SDK so that nothing composing it — the tool node above all — can pull
                // untrusted user text into an agent's context.
                case "comments":
                    return {
                        comments: await this.gammaClient.comments.list({
                            parent_entity_type: Polymarket.Gamma.Comment.ParentEntityType.parse(
                                fields.listCommentsParentEntityType),
                            parent_entity_id: fields.listCommentsParentId,
                            get_positions:    fields.listCommentsGetPositions,
                            holders_only:     fields.listCommentsHoldersOnly,
                            limit:            fields.listCommentsMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "trades":
                    return {
                        trades: await polymarket.trades.forMarket({
                            conditionId: fields.listTradesConditionId,
                            side:        fields.listTradesSide === "all" ? undefined : fields.listTradesSide,
                            limit:       fields.listTradesMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "holders":
                    return {
                        holders: await polymarket.holders.forMarket({
                            conditionId: fields.listHoldersConditionId,
                            limit:       fields.listHoldersMaxResults,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }


        switch (fields.getResource) {

            case "market":
                return {
                    market: await polymarket.markets.get(fields.getMarketIdentifier),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "marketStats":
                return {
                    stats: await polymarket.markets.stats(fields.getMarketStatsIdentifier),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "event":
                return {
                    event: await polymarket.events.get(fields.getEventIdentifier),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "eventStats":
                return {
                    stats: await polymarket.events.stats(fields.getEventStatsIdentifier),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "series":
                return {
                    series: await polymarket.series.get(fields.getSeriesIdentifier),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "tag":
                return {
                    tag: await polymarket.tags.get(fields.getTagIdentifier),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "price":
                return {
                    price: await polymarket.prices.get({
                        tokenId: fields.getPriceTokenId,
                        kind:    fields.getPriceKind,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "orderBook":
                return {
                    orderBook: await polymarket.prices.book({
                        tokenId: fields.getOrderBookTokenId,
                        depth:   fields.getOrderBookDepth,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "priceHistory":
                return {
                    history: await polymarket.prices.history({
                        tokenId:  fields.getPriceHistoryTokenId,
                        interval: fields.getPriceHistoryInterval,
                        fidelity: fields.getPriceHistoryFidelity,
                        points:   fields.getPriceHistoryPoints,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "mechanics":
                return {
                    mechanics: await polymarket.prices.mechanics(fields.getMarketMechanicsTokenId),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "marketConfig":
                return {
                    market: await polymarket.markets.config(fields.getClobMarketConditionId),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "rewards":
                return {
                    rewards: await polymarket.markets.rewards(fields.getMarketRewardsConditionId),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "openInterest":
                return {
                    openInterest: await polymarket.stats.openInterest(fields.getOpenInterestConditionId),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {
            volume: await polymarket.stats.liveVolume(fields.getLiveVolumeEventId),
        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }


    private readonly polymarket:  PolymarketPublicSDK;
    private readonly gammaClient: PolymarketGammaClient;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
        this.polymarket  = new PolymarketPublicSDK(this.httpClientFactory);
        this.gammaClient = new PolymarketGammaClient(this.httpClientFactory);
    }
}
