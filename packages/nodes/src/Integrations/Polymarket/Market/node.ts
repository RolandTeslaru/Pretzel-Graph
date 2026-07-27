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
import {
    clampLimit,
    listEvents,
    listMarkets,
    searchMarketsLocal,
} from "./query";
import { buildTools } from "./tools";


const requiredText = (value: string, displayName: string) => {
    const text = value.trim();

    if (!text)
        throw new Error(`Polymarket Market: '${displayName}' is required.`);

    return text;
};

const positiveInteger = (value: string, displayName: string) => {
    const number = Number(value);

    if (!Number.isInteger(number) || number < 1)
        throw new Error(`Polymarket Market: '${displayName}' must be a positive integer.`);

    return number;
};


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

            if (fields.searchKind === "markets") {
                const limit      = clampLimit(fields.searchMarketsMaxResults, 20);
                const query      = fields.searchMarketsQuery.trim();
                const fetchLimit = query ? Math.max(limit, 100) : limit;
                const markets    = await listMarkets(clients.gamma, fields.searchMarketsStatus, fetchLimit);

                return {
                    markets: searchMarketsLocal(markets, query, limit),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            return {
                results: await clients.gamma.search.public({
                    q:               requiredText(fields.publicSearchQuery, "Query"),
                    limit_per_type:  clampLimit(fields.publicSearchMaxResults, 20),
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
                            markets: await listMarkets(
                                clients.gamma,
                                fields.listMarketsStatus,
                                clampLimit(fields.listMarketsMaxResults, 20),
                            ),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "events":
                        return {
                            events: await listEvents(
                                clients.gamma,
                                fields.listEventsStatus,
                                clampLimit(fields.listEventsMaxResults, 20),
                            ),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "tags":
                        return {
                            tags: await clients.gamma.tags.list({
                                limit: clampLimit(fields.listTagsMaxResults, 20),
                            }),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                    case "series": {
                        const slug = fields.listSeriesSlug.trim();

                        return {
                            series: await clients.gamma.series.list({
                                limit: clampLimit(fields.listSeriesMaxResults, 20),
                                slug:  slug ? [slug] : undefined,
                            }),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                    }

                    case "comments":
                        return {
                            comments: await clients.gamma.comments.list({
                                parent_entity_type: Polymarket.Gamma.Comment.ParentEntityType.parse(
                                    fields.listCommentsParentEntityType,
                                ),
                                parent_entity_id: positiveInteger(
                                    requiredText(fields.listCommentsParentId, "Parent ID"),
                                    "Parent ID",
                                ),
                                get_positions: fields.listCommentsGetPositions,
                                holders_only:  fields.listCommentsHoldersOnly,
                                limit:         clampLimit(fields.listCommentsMaxResults, 20),
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
                                limit: clampLimit(fields.listTeamsMaxResults, 20),
                                name:  name ? [name] : undefined,
                            }),
                        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                    }
                }
            }

            if (fields.listDataResource === "trades") {
                const conditionId = Polymarket.Data.Common.ConditionId.parse(
                    requiredText(fields.listTradesConditionId, "Condition ID"),
                );

                return {
                    trades: await clients.data.trades.list({
                        market: [conditionId],
                        limit:  clampLimit(fields.listTradesMaxResults, 100, 10_000),
                        side:   fields.listTradesSide === "all"
                            ? undefined
                            : Polymarket.Data.Common.Side.parse(fields.listTradesSide),
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            const conditionId = Polymarket.Data.Common.ConditionId.parse(
                requiredText(fields.listHoldersConditionId, "Condition ID"),
            );

            return {
                holders: await clients.data.markets.listHolders({
                    market: [conditionId],
                    limit:  clampLimit(fields.listHoldersMaxResults, 20, 20),
                }),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }


        if (fields.getAPI === "gamma") {
            switch (fields.getGammaResource) {

                case "market": {
                    const identifier = requiredText(fields.getMarketIdentifier, "Market Identifier");
                    const market     = fields.getMarketLookupBy === "slug"
                        ? await clients.gamma.markets.getBySlug({ slug: identifier })
                        : await clients.gamma.markets.getById({
                            id: Polymarket.Gamma.Market.Id.parse(identifier),
                        });

                    return { market } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                }

                case "event": {
                    const identifier = requiredText(fields.getEventIdentifier, "Event Identifier");
                    const event      = fields.getEventLookupBy === "slug"
                        ? await clients.gamma.events.getBySlug({ slug: identifier })
                        : await clients.gamma.events.getById({
                            id: Polymarket.Gamma.Event.Id.parse(identifier),
                        });

                    return { event } satisfies InferOutputs<typeof Blueprint, typeof fields>;
                }

                case "tag": {
                    const identifier = requiredText(fields.getTagIdentifier, "Tag Identifier");
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
                            id: Polymarket.Gamma.Series.Id.parse(
                                requiredText(fields.getSeriesIdentifier, "Series ID"),
                            ),
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }
        }


        if (fields.getAPI === "clob") {
            switch (fields.getClobResource) {

                case "marketConfiguration":
                    return {
                        market: await clients.clob.markets.getClobInfo({
                            condition_id: requiredText(fields.getClobMarketConditionId, "Condition ID"),
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "orderBook":
                    return {
                        orderBook: await clients.clob.marketData.getOrderBook({
                            token_id: requiredText(fields.getOrderBookTokenId, "Token ID"),
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "midpoint":
                    return {
                        midpoint: await clients.clob.marketData.getMidpoint({
                            token_id: requiredText(fields.getMidpointTokenId, "Token ID"),
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "price":
                    return {
                        price: await clients.clob.marketData.getPrice({
                            token_id: requiredText(fields.getPriceTokenId, "Token ID"),
                            side:     Polymarket.CLOB.Common.Side.parse(fields.getPriceSide),
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "spread":
                    return {
                        spread: await clients.clob.marketData.getSpread({
                            token_id: requiredText(fields.getSpreadTokenId, "Token ID"),
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "lastTradePrice":
                    return {
                        lastTrade: await clients.clob.marketData.getLastTradePrice({
                            token_id: requiredText(fields.getLastTradePriceTokenId, "Token ID"),
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "priceHistory":
                    return {
                        history: await clients.clob.marketData.getPriceHistory({
                            market:   requiredText(fields.getPriceHistoryTokenId, "Token ID"),
                            interval: Polymarket.CLOB.Common.PriceHistoryInterval.parse(
                                fields.getPriceHistoryInterval,
                            ),
                            fidelity: fields.getPriceHistoryFidelity,
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;

                case "mechanics": {
                    const tokenId = requiredText(fields.getMarketMechanicsTokenId, "Token ID");
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
                            condition_id: requiredText(fields.getMarketRewardsConditionId, "Condition ID"),
                        }),
                    } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }
        }


        if (fields.getDataResource === "openInterest") {
            const conditionId = Polymarket.Data.Common.ConditionId.parse(
                requiredText(fields.getOpenInterestConditionId, "Condition ID"),
            );

            return {
                openInterest: await clients.data.markets.getOpenInterest({
                    market: [conditionId],
                }),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {
            volume: await clients.data.markets.getLiveVolume({
                id: positiveInteger(
                    requiredText(fields.getLiveVolumeEventId, "Event ID"),
                    "Event ID",
                ),
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
