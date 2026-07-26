import {
    PolymarketDataClient,
    PolymarketGammaClient,
    PolymarketUnauthenticatedCLOBClient,
} from "../client";
import { Polymarket } from "../domain";
import { MarketAction, type MarketLookup } from "./actions";
import { clampLimit, searchMarketsLocal } from "./query";
import {
    compactEvent,
    compactMarket,
    type MarketStatus,
} from "./shapes";

export type MarketClients = {
    gamma: PolymarketGammaClient;
    clob:  PolymarketUnauthenticatedCLOBClient;
    data:  PolymarketDataClient;
};

export type MarketRunInput = {
    action:  MarketAction.Operation.Type;
    fields:  Record<string, unknown>;
    clients: MarketClients;
};

const requiredText = (
    fields: Record<string, unknown>,
    id: string,
    displayName: string,
) => {
    const value = fields[id];
    const text  = typeof value === "string" ? value.trim() : "";

    if (!text)
        throw new Error(`Polymarket Market: '${displayName}' is required.`);

    return text;
};

const optionalText = (
    fields: Record<string, unknown>,
    id: string,
) => {
    const value = fields[id];
    return typeof value === "string" ? value.trim() : "";
};

const fieldString = (
    fields: Record<string, unknown>,
    id: string,
    fallback: string,
) => {
    const value = fields[id];
    return typeof value === "string" && value.length > 0
        ? value
        : fallback;
};

const fieldNumber = (
    fields: Record<string, unknown>,
    id: string,
    fallback: number,
) => {
    const value = fields[id];
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : fallback;
};

const fieldBoolean = (
    fields: Record<string, unknown>,
    id: string,
) => fields[id] === true;

const positiveInteger = (value: string, displayName: string) => {
    const number = Number(value);

    if (!Number.isInteger(number) || number < 1)
        throw new Error(`Polymarket Market: '${displayName}' must be a positive integer.`);

    return number;
};

export const statusQuery = (
    status: MarketStatus,
): { active?: boolean; closed?: boolean } => {
    if (status === "active")
        return { active: true, closed: false };
    if (status === "closed")
        return { closed: true };
    return {};
};

export const listMarkets = async (
    gamma: PolymarketGammaClient,
    status: MarketStatus,
    limit: number,
) => {
    const request = {
        limit,
        order:     "volume",
        ascending: false,
    } as const;

    const markets = status === "all"
        ? (await Promise.all([
            gamma.markets.list({
                ...request,
                active: true,
                closed: false,
            }),
            gamma.markets.list({
                ...request,
                closed: true,
            }),
        ])).flat()
        : await gamma.markets.list({
            ...request,
            ...statusQuery(status),
        });

    const unique = new Map(
        markets.map(market => [
            market.id ?? market.slug ?? JSON.stringify(market),
            compactMarket(market),
        ]),
    );

    return [...unique.values()]
        .sort((left, right) =>
            Number(right.volume ?? 0) - Number(left.volume ?? 0))
        .slice(0, limit);
};

export const listEvents = async (
    gamma: PolymarketGammaClient,
    status: MarketStatus,
    limit: number,
) => {
    const events = await gamma.events.list({
        ...statusQuery(status),
        limit,
        order:     "volume",
        ascending: false,
    });

    return events.map(compactEvent);
};



const lookup = (
    fields: Record<string, unknown>,
    id: string,
): MarketLookup =>
    fieldString(fields, id, "id") === "slug"
        ? "slug"
        : "id";




export async function runMarketAction({
    action,
    fields,
    clients,
}: MarketRunInput): Promise<Record<string, unknown>> {
    const status = fieldString(
        fields,
        `${action}Status`,
        "active",
    ) as MarketStatus;
    
    const limit = clampLimit(
        fieldNumber(fields, `${action}MaxResults`, 20),
        20,
        action === "listHolders" ? 20 : action === "listTrades" ? 10_000 : 500,
    );

    switch (action) {
        case "searchMarkets": {
            const query = optionalText(fields, "searchMarketsQuery");
            const fetchLimit = query ? Math.max(limit, 100) : limit;
            const markets = await listMarkets(
                clients.gamma,
                status,
                fetchLimit,
            );

            return {
                markets: searchMarketsLocal(markets, query, limit),
            };
        }

        case "listMarkets":
            return {
                markets: await listMarkets(clients.gamma, status, limit),
            };

        case "getMarket": {
            const identifier = requiredText(
                fields,
                "getMarketIdentifier",
                "Market Identifier",
            );
            const market = lookup(fields, "getMarketLookupBy") === "slug"
                ? await clients.gamma.markets.getBySlug({ slug: identifier })
                : await clients.gamma.markets.getById({
                    id: Polymarket.Gamma.Market.Id.parse(identifier),
                });

            return { market };
        }

        case "listEvents":
            return {
                events: await listEvents(clients.gamma, status, limit),
            };

        case "getEvent": {
            const identifier = requiredText(
                fields,
                "getEventIdentifier",
                "Event Identifier",
            );
            const event = lookup(fields, "getEventLookupBy") === "slug"
                ? await clients.gamma.events.getBySlug({ slug: identifier })
                : await clients.gamma.events.getById({
                    id: Polymarket.Gamma.Event.Id.parse(identifier),
                });

            return { event };
        }

        case "publicSearch":
            return {
                results: await clients.gamma.search.public({
                    q:               requiredText(fields, "publicSearchQuery", "Query"),
                    limit_per_type:  limit,
                    search_tags:     fieldBoolean(fields, "publicSearchSearchTags"),
                    search_profiles: fieldBoolean(fields, "publicSearchSearchProfiles"),
                }),
            };

        case "listTags":
            return {
                tags: await clients.gamma.tags.list({ limit }),
            };

        case "getTag": {
            const identifier = requiredText(
                fields,
                "getTagIdentifier",
                "Tag Identifier",
            );
            const tag = lookup(fields, "getTagLookupBy") === "slug"
                ? await clients.gamma.tags.getBySlug({ slug: identifier })
                : await clients.gamma.tags.getById({
                    id: Polymarket.Gamma.Tag.Id.parse(identifier),
                });

            return { tag };
        }

        case "listSeries": {
            const query = optionalText(fields, "listSeriesSlug");
            return {
                series: await clients.gamma.series.list({
                    limit,
                    slug: query ? [query] : undefined,
                }),
            };
        }

        case "getSeries":
            return {
                series: await clients.gamma.series.getById({
                    id: Polymarket.Gamma.Series.Id.parse(
                        requiredText(
                            fields,
                            "getSeriesIdentifier",
                            "Series Identifier",
                        ),
                    ),
                }),
            };

        case "listComments":
            return {
                comments: await clients.gamma.comments.list({
                    parent_entity_type: Polymarket.Gamma.Comment.ParentEntityType.parse(
                        fieldString(fields, "listCommentsParentEntityType", "Event"),
                    ),
                    parent_entity_id: positiveInteger(
                        requiredText(fields, "listCommentsParentId", "Parent ID"),
                        "Parent ID",
                    ),
                    get_positions: fieldBoolean(fields, "listCommentsGetPositions"),
                    holders_only:  fieldBoolean(fields, "listCommentsHoldersOnly"),
                    limit,
                }),
            };

        case "listSports":
            return {
                sports: await clients.gamma.sports.list({}),
            };

        case "listTeams": {
            const query = optionalText(fields, "listTeamsName");
            return {
                teams: await clients.gamma.sports.listTeams({
                    limit,
                    name: query ? [query] : undefined,
                }),
            };
        }

        case "listClobMarkets":
            return {
                page: await clients.clob.markets.list({
                    next_cursor: fieldString(fields, "listClobMarketsNextCursor", "") || undefined,
                }),
            };

        case "getClobMarket":
            return {
                market: await clients.clob.markets.getClobInfo({
                    condition_id: requiredText(
                        fields,
                        "getClobMarketConditionId",
                        "Condition ID",
                    ),
                }),
            };

        case "getOrderBook":
            return {
                orderBook: await clients.clob.marketData.getOrderBook({
                    token_id: requiredText(fields, "getOrderBookTokenId", "Token ID"),
                }),
            };

        case "getMidpoint":
            return {
                midpoint: await clients.clob.marketData.getMidpoint({
                    token_id: requiredText(fields, "getMidpointTokenId", "Token ID"),
                }),
            };

        case "getPrice":
            return {
                price: await clients.clob.marketData.getPrice({
                    token_id: requiredText(fields, "getPriceTokenId", "Token ID"),
                    side: Polymarket.CLOB.Common.Side.parse(
                        fieldString(fields, "getPriceSide", "BUY"),
                    ),
                }),
            };

        case "getSpread":
            return {
                spread: await clients.clob.marketData.getSpread({
                    token_id: requiredText(fields, "getSpreadTokenId", "Token ID"),
                }),
            };

        case "getLastTradePrice":
            return {
                lastTrade: await clients.clob.marketData.getLastTradePrice({
                    token_id: requiredText(fields, "getLastTradePriceTokenId", "Token ID"),
                }),
            };

        case "getPriceHistory":
            return {
                history: await clients.clob.marketData.getPriceHistory({
                    market:   requiredText(fields, "getPriceHistoryTokenId", "Token ID"),
                    interval: Polymarket.CLOB.Common.PriceHistoryInterval.parse(
                        fieldString(fields, "getPriceHistoryInterval", "1d"),
                    ),
                    fidelity: fieldNumber(fields, "getPriceHistoryFidelity", 60),
                }),
            };

        case "getMarketMechanics": {
            const tokenId = requiredText(fields, "getMarketMechanicsTokenId", "Token ID");
            const [tickSize, negRisk, feeRate, feeExponent] =
                await Promise.all([
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
            };
        }

        case "listMarketActivity":
            return {
                activity: await clients.clob.trades.listMarketEvents({
                    condition_id: requiredText(
                        fields,
                        "listMarketActivityConditionId",
                        "Condition ID",
                    ),
                }),
            };

        case "getMarketRewards":
            return {
                rewards: await clients.clob.rewards.getMarket({
                    condition_id: requiredText(
                        fields,
                        "getMarketRewardsConditionId",
                        "Condition ID",
                    ),
                }),
            };

        case "listTrades": {
            const conditionId = Polymarket.Data.Common.ConditionId.parse(
                requiredText(fields, "listTradesConditionId", "Condition ID"),
            );
            const side = fieldString(fields, "listTradesSide", "all");

            return {
                trades: await clients.data.trades.list({
                    market: [conditionId],
                    limit,
                    side: side === "all"
                        ? undefined
                        : Polymarket.Data.Common.Side.parse(side),
                }),
            };
        }

        case "listHolders": {
            const conditionId = Polymarket.Data.Common.ConditionId.parse(
                requiredText(fields, "listHoldersConditionId", "Condition ID"),
            );

            return {
                holders: await clients.data.markets.listHolders({
                    market: [conditionId],
                    limit,
                }),
            };
        }

        case "getOpenInterest": {
            const conditionId = Polymarket.Data.Common.ConditionId.parse(
                requiredText(fields, "getOpenInterestConditionId", "Condition ID"),
            );

            return {
                openInterest: await clients.data.markets.getOpenInterest({
                    market: [conditionId],
                }),
            };
        }

        case "getLiveVolume":
            return {
                volume: await clients.data.markets.getLiveVolume({
                    id: positiveInteger(
                        requiredText(fields, "getLiveVolumeEventId", "Event ID"),
                        "Event ID",
                    ),
                }),
            };

        default:
            action satisfies never;
            throw new Error(`Unsupported Polymarket Market action: ${action}`);
    }
}
