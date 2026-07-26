import { Foundations } from "@pretzel-graph/shared/domain";
import { FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

import { MarketAction } from "./actions";

const asField  = (b: unknown) => b as unknown as Foundations.Field;
const asOutput = (b: unknown) => b as unknown as Foundations.Port.Output;

export const statusOptions = [
    { value: "active", displayName: "Active" },
    { value: "closed", displayName: "Closed" },
    { value: "all",    displayName: "All"    },
] as const;

const lookupOptions = [
    { value: "id",   displayName: "ID"   },
    { value: "slug", displayName: "Slug" },
] as const;

const sideOptions = [
    { value: "BUY",  displayName: "Buy"  },
    { value: "SELL", displayName: "Sell" },
] as const;

const tradeSideOptions = [
    { value: "all",  displayName: "All"  },
    { value: "BUY",  displayName: "Buy"  },
    { value: "SELL", displayName: "Sell" },
] as const;

const intervalOptions = [
    { value: "1h",  displayName: "1 hour"  },
    { value: "6h",  displayName: "6 hours" },
    { value: "1d",  displayName: "1 day"   },
    { value: "1w",  displayName: "1 week"  },
    { value: "max", displayName: "Max"     },
] as const;

const parentEntityOptions = [
    { value: "Event",  displayName: "Event"  },
    { value: "Series", displayName: "Series" },
    { value: "market", displayName: "Market" },
] as const;

// run.ts reads status and result caps under `${operation}Status` / `${operation}MaxResults`.
const status = (operation: string) => asField(FieldBuilder.MultiOption(`${operation}Status`, "Status", {
    options: statusOptions,
    initialValue: "active",
    variant: "tab",
    tooltip: "Filter by market status."
}));

const maxResults = (operation: string, initialValue: number, max: number) =>
    asField(FieldBuilder.Integer(`${operation}MaxResults`, "Max Results", {
        initialValue,
        min: 1,
        max,
        tooltip: "Maximum number of records to return."
    }));

const text = (id: string, displayName: string, options: { required?: boolean, placeholder?: string, tooltip?: string } = {}) =>
    asField(FieldBuilder.String(id, displayName, options));

const lookupBy = (operation: string) => asField(FieldBuilder.MultiOption(`${operation}LookupBy`, "Look Up By", {
    options: lookupOptions,
    initialValue: "id",
    variant: "tab",
    tooltip: "Whether the identifier is a numeric ID or a slug."
}));

const conditionId = (operation: string) => text(`${operation}ConditionId`, "Condition ID", {
    required: true,
    placeholder: "0x…",
    tooltip: "Market condition ID — a 0x-prefixed 64-hex string."
});

const tokenId = (operation: string) => text(`${operation}TokenId`, "Token ID", {
    required: true,
    tooltip: "CLOB token id for a single outcome, taken from a market's clobTokenIds."
});

const flag = (id: string, displayName: string, tooltip: string) =>
    asField(FieldBuilder.Boolean(id, displayName, { initialValue: false, tooltip }));


type OperationSpec = {
    fields: () => Foundations.Field[],
    output: () => Foundations.Port.Output,
};

export const OPERATIONS: Record<MarketAction.Operation.Type, OperationSpec> = {

    searchMarkets: {
        fields: () => [
            text("searchMarketsQuery", "Query", {
                placeholder: "election",
                tooltip: "Substring matched against market question and slug. Leave empty to list top markets by volume."
            }),
            status("searchMarkets"),
            maxResults("searchMarkets", 20, 500),
        ],
        output: () => asOutput(OutputBuilder.DataList("markets", "Markets", {
            tooltip: "Matching markets with outcomes, outcome prices and CLOB token ids."
        })),
    },

    publicSearch: {
        fields: () => [
            text("publicSearchQuery", "Query", { required: true, tooltip: "Search term." }),
            flag("publicSearchSearchTags", "Include Tags", "Also match tags."),
            flag("publicSearchSearchProfiles", "Include Profiles", "Also match public profiles."),
            maxResults("publicSearch", 20, 500),
        ],
        output: () => asOutput(OutputBuilder.Json("results", "Results", {
            tooltip: "Grouped matches across events, markets, tags and profiles."
        })),
    },

    listMarkets: {
        fields: () => [status("listMarkets"), maxResults("listMarkets", 20, 500)],
        output: () => asOutput(OutputBuilder.DataList("markets", "Markets", {
            tooltip: "Markets ordered by trading volume."
        })),
    },

    listEvents: {
        fields: () => [status("listEvents"), maxResults("listEvents", 20, 500)],
        output: () => asOutput(OutputBuilder.DataList("events", "Events", {
            tooltip: "Events ordered by trading volume. An event groups related markets."
        })),
    },

    listTags: {
        fields: () => [maxResults("listTags", 20, 500)],
        output: () => asOutput(OutputBuilder.DataList("tags", "Tags", {
            tooltip: "Tags used to categorize markets and events."
        })),
    },

    listSeries: {
        fields: () => [
            text("listSeriesSlug", "Slug", { tooltip: "Optional slug filter. Leave empty to list all series." }),
            maxResults("listSeries", 20, 500),
        ],
        output: () => asOutput(OutputBuilder.DataList("series", "Series", {
            tooltip: "Recurring or grouped series."
        })),
    },

    listComments: {
        fields: () => [
            asField(FieldBuilder.MultiOption("listCommentsParentEntityType", "Parent Type", {
                options: parentEntityOptions,
                initialValue: "Event",
                variant: "tab",
                tooltip: "What the comments are attached to."
            })),
            text("listCommentsParentId", "Parent ID", {
                required: true,
                tooltip: "Numeric ID of the parent event, series or market."
            }),
            flag("listCommentsGetPositions", "Include Positions", "Include each commenter's position."),
            flag("listCommentsHoldersOnly", "Holders Only", "Only return comments from holders."),
            maxResults("listComments", 20, 500),
        ],
        output: () => asOutput(OutputBuilder.DataList("comments", "Comments", {
            tooltip: "Public comments on the parent entity."
        })),
    },

    listSports: {
        fields: () => [],
        output: () => asOutput(OutputBuilder.DataList("sports", "Sports", {
            tooltip: "Sports and leagues currently supported."
        })),
    },

    listTeams: {
        fields: () => [
            text("listTeamsName", "Team Name", { tooltip: "Optional name filter. Leave empty to list all teams." }),
            maxResults("listTeams", 20, 500),
        ],
        output: () => asOutput(OutputBuilder.DataList("teams", "Teams", {
            tooltip: "Sports teams."
        })),
    },

    listClobMarkets: {
        fields: () => [
            text("listClobMarketsNextCursor", "Next Cursor", {
                tooltip: "Cursor from a previous page. Leave empty for the first page."
            }),
        ],
        output: () => asOutput(OutputBuilder.Json("page", "Page", {
            tooltip: "One cursor-paginated page of CLOB market configurations."
        })),
    },

    listMarketActivity: {
        fields: () => [conditionId("listMarketActivity")],
        output: () => asOutput(OutputBuilder.DataList("activity", "Activity", {
            tooltip: "Recent public trade events for the condition."
        })),
    },

    listTrades: {
        fields: () => [
            conditionId("listTrades"),
            asField(FieldBuilder.MultiOption("listTradesSide", "Side", {
                options: tradeSideOptions,
                initialValue: "all",
                variant: "tab",
                tooltip: "Restrict to one side of the book."
            })),
            maxResults("listTrades", 100, 10_000),
        ],
        output: () => asOutput(OutputBuilder.DataList("trades", "Trades", {
            tooltip: "Public trades for the condition."
        })),
    },

    listHolders: {
        fields: () => [conditionId("listHolders"), maxResults("listHolders", 20, 20)],
        output: () => asOutput(OutputBuilder.DataList("holders", "Holders", {
            tooltip: "Largest outcome-token holders for the condition."
        })),
    },

    getMarket: {
        fields: () => [
            text("getMarketIdentifier", "Market Identifier", { required: true, tooltip: "Numeric market ID or slug." }),
            lookupBy("getMarket"),
        ],
        output: () => asOutput(OutputBuilder.Json("market", "Market", {
            tooltip: "Full Gamma market detail."
        })),
    },

    getEvent: {
        fields: () => [
            text("getEventIdentifier", "Event Identifier", { required: true, tooltip: "Numeric event ID or slug." }),
            lookupBy("getEvent"),
        ],
        output: () => asOutput(OutputBuilder.Json("event", "Event", {
            tooltip: "Full Gamma event detail."
        })),
    },

    getTag: {
        fields: () => [
            text("getTagIdentifier", "Tag Identifier", { required: true, tooltip: "Numeric tag ID or slug." }),
            lookupBy("getTag"),
        ],
        output: () => asOutput(OutputBuilder.Json("tag", "Tag", {
            tooltip: "Full tag detail."
        })),
    },

    getSeries: {
        fields: () => [
            text("getSeriesIdentifier", "Series Identifier", { required: true, tooltip: "Numeric series ID." }),
        ],
        output: () => asOutput(OutputBuilder.Json("series", "Series", {
            tooltip: "Full series detail."
        })),
    },

    getClobMarket: {
        fields: () => [conditionId("getClobMarket")],
        output: () => asOutput(OutputBuilder.Json("market", "Market", {
            tooltip: "Matching-engine configuration for the condition."
        })),
    },

    getOrderBook: {
        fields: () => [tokenId("getOrderBook")],
        output: () => asOutput(OutputBuilder.Json("orderBook", "Order Book", {
            tooltip: "Current bids and asks for the outcome token."
        })),
    },

    getMidpoint: {
        fields: () => [tokenId("getMidpoint")],
        output: () => asOutput(OutputBuilder.Json("midpoint", "Midpoint", {
            tooltip: "Current midpoint price for the outcome token."
        })),
    },

    getPrice: {
        fields: () => [
            tokenId("getPrice"),
            asField(FieldBuilder.MultiOption("getPriceSide", "Side", {
                options: sideOptions,
                initialValue: "BUY",
                variant: "tab",
                tooltip: "Which side of the book to price."
            })),
        ],
        output: () => asOutput(OutputBuilder.Json("price", "Price", {
            tooltip: "Current price for the requested side."
        })),
    },

    getSpread: {
        fields: () => [tokenId("getSpread")],
        output: () => asOutput(OutputBuilder.Json("spread", "Spread", {
            tooltip: "Current bid-ask spread for the outcome token."
        })),
    },

    getLastTradePrice: {
        fields: () => [tokenId("getLastTradePrice")],
        output: () => asOutput(OutputBuilder.Json("lastTrade", "Last Trade", {
            tooltip: "Most recent trade price and side."
        })),
    },

    getPriceHistory: {
        fields: () => [
            tokenId("getPriceHistory"),
            asField(FieldBuilder.MultiOption("getPriceHistoryInterval", "Interval", {
                options: intervalOptions,
                initialValue: "1d",
                tooltip: "How far back the history window reaches."
            })),
            asField(FieldBuilder.Integer("getPriceHistoryFidelity", "Fidelity (minutes)", {
                initialValue: 60,
                min: 1,
                tooltip: "Resolution of each history point, in minutes."
            })),
        ],
        output: () => asOutput(OutputBuilder.DataList("history", "History", {
            tooltip: "Historical price points for the outcome token."
        })),
    },

    getMarketMechanics: {
        fields: () => [tokenId("getMarketMechanics")],
        output: () => asOutput(OutputBuilder.Json("mechanics", "Mechanics", {
            tooltip: "Tick size, negative-risk status and fee configuration."
        })),
    },

    getMarketRewards: {
        fields: () => [conditionId("getMarketRewards")],
        output: () => asOutput(OutputBuilder.Json("rewards", "Rewards", {
            tooltip: "Liquidity-reward configuration for the condition."
        })),
    },

    getOpenInterest: {
        fields: () => [conditionId("getOpenInterest")],
        output: () => asOutput(OutputBuilder.Json("openInterest", "Open Interest", {
            tooltip: "Open interest for the condition."
        })),
    },

    getLiveVolume: {
        fields: () => [
            text("getLiveVolumeEventId", "Event ID", { required: true, tooltip: "Numeric event ID." }),
        ],
        output: () => asOutput(OutputBuilder.Json("volume", "Volume", {
            tooltip: "Live trading volume for the event."
        })),
    },
};

// Every field id any operation can contribute — reconcile strips these off the base
// before appending the selected operation's own set.
export const OPERATION_FIELD_IDS = Object.values(OPERATIONS)
    .flatMap(spec => spec.fields().map(field => field.id));
