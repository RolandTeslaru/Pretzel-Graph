import {
    RegisterNode,
    RuntimeNode,
    type InferOutputs,
} from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import {
    PolymarketDataClient,
    PolymarketGammaClient,
    PolymarketUnauthenticatedCLOBClient,
} from "../client";
import { Polymarket } from "../domain";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";



@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields  = this.fieldValues;
        const clients = {
            gamma: this.gammaClient,
            clob:  this.clobClient,
            data:  this.dataClient,
        };

        // defineTool is terminal and total-replacing, so tool mode is a disjoint arm — none of the
        // run-mode fields exist here, and there's no reconciliation to do. One entry point.
        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(clients),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;


        if (fields.action === "search") {

            if (fields.searchKind === "markets")
                return {
                    markets: await Polymarket.Market.search(clients.gamma, {
                        query:  fields.searchMarketsQuery,
                        status: fields.searchMarketsStatus,
                        limit:  fields.searchMarketsMaxResults,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            return {
                results: await clients.gamma.search.public({
                    q:               fields.publicSearchQuery,
                    limit_per_type:  fields.publicSearchMaxResults,
                    search_tags:     fields.publicSearchSearchTags,
                    search_profiles: fields.publicSearchSearchProfiles,
                }),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }


        if (fields.action === "list") {

            if (fields.listAPI === "gamma") {
                switch (fields.listGammaResource) {

                    case "markets":
                        return {
                            markets: await Polymarket.Market.list(
                                clients.gamma,
                                fields.listMarketsStatus,
                                fields.listMarketsMaxResults,
                            ),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "events":
                        return {
                            events: await Polymarket.Event.list(
                                clients.gamma,
                                fields.listEventsStatus,
                                fields.listEventsMaxResults,
                            ),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "tags":
                        return {
                            tags: await clients.gamma.tags.list({
                                limit: fields.listTagsMaxResults,
                            }),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "series": {
                        const slug = fields.listSeriesSlug.trim();

                        return {
                            series: await clients.gamma.series.list({
                                limit: fields.listSeriesMaxResults,
                                slug:  slug ? [slug] : undefined,
                            }),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                    }

                    case "comments":
                        return {
                            comments: await clients.gamma.comments.list({
                                parent_entity_type: Polymarket.Gamma.Comment.ParentEntityType.parse(fields.listCommentsParentEntityType),
                                parent_entity_id: fields.listCommentsParentId,
                                get_positions: fields.listCommentsGetPositions,
                                holders_only:  fields.listCommentsHoldersOnly,
                                limit:         fields.listCommentsMaxResults,
                            }),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "sports":
                        return {
                            sports: await clients.gamma.sports.list({}),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "teams": {
                        const name = fields.listTeamsName.trim();

                        return {
                            teams: await clients.gamma.sports.listTeams({
                                limit: fields.listTeamsMaxResults,
                                name:  name ? [name] : undefined,
                            }),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                    }
                }
            }

            if (fields.listDataResource === "trades") {
                const conditionId = Polymarket.Data.Common.ConditionId.parse(fields.listTradesConditionId);

                return {
                    trades: await clients.data.trades.list({
                        market: [conditionId],
                        limit:  fields.listTradesMaxResults,
                        side:   fields.listTradesSide === "all"
                            ? undefined
                            : Polymarket.Data.Common.Side.parse(fields.listTradesSide),
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            const conditionId = Polymarket.Data.Common.ConditionId.parse(fields.listHoldersConditionId);

            return {
                holders: await clients.data.markets.listHolders({
                    market: [conditionId],
                    limit:  fields.listHoldersMaxResults,
                }),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }


        if (fields.getAPI === "gamma") {
            switch (fields.getGammaResource) {

                case "market": {
                    const identifier = fields.getMarketIdentifier;
                    const market     = fields.getMarketLookupBy === "slug"
                        ? await clients.gamma.markets.getBySlug({ slug: identifier })
                        : await clients.gamma.markets.getById({
                            id: Polymarket.Gamma.Market.Id.parse(identifier),
                        });

                    return { market } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                }

                case "event": {
                    const identifier = fields.getEventIdentifier;
                    const event      = fields.getEventLookupBy === "slug"
                        ? await clients.gamma.events.getBySlug({ slug: identifier })
                        : await clients.gamma.events.getById({
                            id: Polymarket.Gamma.Event.Id.parse(identifier),
                        });

                    return { event } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                }

                case "tag": {
                    const identifier = fields.getTagIdentifier;
                    const tag        = fields.getTagLookupBy === "slug"
                        ? await clients.gamma.tags.getBySlug({ slug: identifier })
                        : await clients.gamma.tags.getById({
                            id: Polymarket.Gamma.Tag.Id.parse(identifier),
                        });

                    return { tag } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                }

                case "series":
                    return {
                        series: await clients.gamma.series.getById({
                            id: Polymarket.Gamma.Series.Id.parse(fields.getSeriesIdentifier),
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }
        }


        if (fields.getAPI === "clob") {
            switch (fields.getClobResource) {

                case "marketConfiguration":
                    return {
                        market: await clients.clob.markets.getClobInfo({
                            condition_id: fields.getClobMarketConditionId,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "orderBook":
                    return {
                        orderBook: await clients.clob.marketData.getOrderBook({
                            token_id: fields.getOrderBookTokenId,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "midpoint":
                    return {
                        midpoint: await clients.clob.marketData.getMidpoint({
                            token_id: fields.getMidpointTokenId,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "price":
                    return {
                        price: await clients.clob.marketData.getPrice({
                            token_id: fields.getPriceTokenId,
                            side:     Polymarket.CLOB.Common.Side.parse(fields.getPriceSide),
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "spread":
                    return {
                        spread: await clients.clob.marketData.getSpread({
                            token_id: fields.getSpreadTokenId,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "lastTradePrice":
                    return {
                        lastTrade: await clients.clob.marketData.getLastTradePrice({
                            token_id: fields.getLastTradePriceTokenId,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "priceHistory":
                    return {
                        history: await clients.clob.marketData.getPriceHistory({
                            market:   fields.getPriceHistoryTokenId,
                            interval: Polymarket.CLOB.Common.PriceHistoryInterval.parse(fields.getPriceHistoryInterval),
                            fidelity: fields.getPriceHistoryFidelity,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "mechanics": {
                    const tokenId = fields.getMarketMechanicsTokenId;
                    const [tickSize, negRisk, feeRate, feeExponent] = await Promise.all([
                        clients.clob.marketData.getTickSize({ token_id: tokenId }),
                        clients.clob.marketData.getNegRisk({ token_id: tokenId }),
                        clients.clob.marketData.getFeeRate({ token_id: tokenId }),
                        clients.clob.marketData.getFeeExponent({ token_id: tokenId }),
                    ]);

                    return {
                        mechanics: {
                            tokenId,
                            tickSize,
                            negRisk,
                            feeRate,
                            feeExponent,
                        },
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                }

                case "rewards":
                    return {
                        rewards: await clients.clob.rewards.getMarket({
                            condition_id: fields.getMarketRewardsConditionId,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }
        }


        if (fields.getDataResource === "openInterest") {
            const conditionId = Polymarket.Data.Common.ConditionId.parse(fields.getOpenInterestConditionId);

            return {
                openInterest: await clients.data.markets.getOpenInterest({
                    market: [conditionId],
                }),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {
            volume: await clients.data.markets.getLiveVolume({
                id: fields.getLiveVolumeEventId,
            }),
        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }

    private readonly gammaClient: PolymarketGammaClient;
    private readonly clobClient:  PolymarketUnauthenticatedCLOBClient;
    private readonly dataClient:  PolymarketDataClient;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
        this.gammaClient = new PolymarketGammaClient(this.httpClientFactory);
        this.clobClient  = new PolymarketUnauthenticatedCLOBClient(this.httpClientFactory);
        this.dataClient  = new PolymarketDataClient(this.httpClientFactory);
    }
}
