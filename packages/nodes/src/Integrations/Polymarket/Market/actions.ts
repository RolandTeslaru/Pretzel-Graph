export namespace MarketAction {

    export const Options = [
        {
            value:       "search",
            displayName: "Search",
            description: "Search Polymarket markets or the public discovery index.",
        },
        {
            value:       "list",
            displayName: "List",
            description: "List metadata, exchange records, or market analytics.",
        },
        {
            value:       "get",
            displayName: "Get",
            description: "Fetch one resource, market-data view, or analytic.",
        },
    ] as const

    export const Default = "search" satisfies Type
    export type Type = typeof Options[number]["value"]



    export namespace SearchKind {
        export const Options = [
            {
                value:       "markets",
                displayName: "Markets",
                description: "Search market questions and slugs, ordered by trading volume.",
            },
            {
                value:       "public",
                displayName: "Public Discovery",
                description: "Search across Polymarket events, markets, tags, and public profiles.",
            },
        ] as const

        export const Default = "markets" satisfies Type
        export type Type = typeof Options[number]["value"]
    }



    export namespace ListAPI {
        export const Options = [
            {
                value:       "gamma",
                displayName: "Metadata",
                description: "Gamma metadata, discovery, discussion, and sports.",
            },
            {
                value:       "clob",
                displayName: "Exchange",
                description: "CLOB-native markets and public market activity.",
            },
            {
                value:       "data",
                displayName: "Analytics",
                description: "Public trades and market holders from the Data API.",
            },
        ] as const

        export const Default = "gamma" satisfies Type
        export type Type = typeof Options[number]["value"]
    }

    export namespace ListGammaKind {
        export const Options = [
            {
                value:       "markets",
                displayName: "Markets",
                description: "List active, closed, or all markets ordered by trading volume.",
            },
            {
                value:       "events",
                displayName: "Events",
                description: "List events and their grouped markets, ordered by trading volume.",
            },
            {
                value:       "tags",
                displayName: "Tags",
                description: "List the tags Polymarket uses to categorize markets and events.",
            },
            {
                value:       "series",
                displayName: "Series",
                description: "List recurring or grouped Polymarket series, optionally by slug.",
            },
            {
                value:       "comments",
                displayName: "Comments",
                description: "Read public comments for an event, market, or series.",
            },
            {
                value:       "sports",
                displayName: "Sports",
                description: "List the sports and leagues currently supported by Polymarket.",
            },
            {
                value:       "teams",
                displayName: "Teams",
                description: "List sports teams, optionally filtered by team name.",
            },
        ] as const

        export const Default = "markets" satisfies Type
        export type Type = typeof Options[number]["value"]
    }

    export namespace ListClobKind {
        export const Options = [
            {
                value:       "markets",
                displayName: "Markets",
                description: "List cursor-paginated CLOB-native market configurations.",
            },
            {
                value:       "activity",
                displayName: "Market Activity",
                description: "List recent public trade events for a condition ID.",
            },
        ] as const

        export const Default = "markets" satisfies Type
        export type Type = typeof Options[number]["value"]
    }

    export namespace ListDataKind {
        export const Options = [
            {
                value:       "trades",
                displayName: "Trades",
                description: "List public Data API trades for a condition ID.",
            },
            {
                value:       "holders",
                displayName: "Holders",
                description: "List the largest outcome-token holders for a condition ID.",
            },
        ] as const

        export const Default = "trades" satisfies Type
        export type Type = typeof Options[number]["value"]
    }



    export namespace GetAPI {
        export const Options = [
            {
                value:       "gamma",
                displayName: "Metadata",
                description: "Gamma markets, events, tags, and series.",
            },
            {
                value:       "clob",
                displayName: "Exchange",
                description: "CLOB configuration, prices, books, mechanics, and rewards.",
            },
            {
                value:       "data",
                displayName: "Analytics",
                description: "Open interest and live volume from the Data API.",
            },
        ] as const

        export const Default = "gamma" satisfies Type
        export type Type = typeof Options[number]["value"]
    }

    export namespace GetGammaKind {
        export const Options = [
            {
                value:       "market",
                displayName: "Market",
                description: "Fetch complete Gamma metadata for one market.",
            },
            {
                value:       "event",
                displayName: "Event",
                description: "Fetch complete Gamma metadata for one event.",
            },
            {
                value:       "tag",
                displayName: "Tag",
                description: "Fetch one tag by its internal ID or human-readable slug.",
            },
            {
                value:       "series",
                displayName: "Series",
                description: "Fetch complete metadata for one series by ID.",
            },
        ] as const

        export const Default = "market" satisfies Type
        export type Type = typeof Options[number]["value"]
    }

    export namespace GetClobKind {
        export const Options = [
            {
                value:       "marketConfiguration",
                displayName: "Market Configuration",
                description: "Fetch matching-engine configuration for a condition ID.",
            },
            {
                value:       "orderBook",
                displayName: "Order Book",
                description: "Fetch the current bids and asks for one outcome token.",
            },
            {
                value:       "midpoint",
                displayName: "Midpoint",
                description: "Fetch the current midpoint price for one outcome token.",
            },
            {
                value:       "price",
                displayName: "Price",
                description: "Fetch the current buy-side or sell-side price for one outcome token.",
            },
            {
                value:       "spread",
                displayName: "Spread",
                description: "Fetch the current bid-ask spread for one outcome token.",
            },
            {
                value:       "lastTradePrice",
                displayName: "Last Trade Price",
                description: "Fetch the most recent trade price and side for one outcome token.",
            },
            {
                value:       "priceHistory",
                displayName: "Price History",
                description: "Fetch historical price points for one outcome token.",
            },
            {
                value:       "mechanics",
                displayName: "Market Mechanics",
                description: "Fetch tick size, negative-risk status, and fee configuration.",
            },
            {
                value:       "rewards",
                displayName: "Market Rewards",
                description: "Fetch liquidity-reward configuration for a condition ID.",
            },
        ] as const

        export const Default = "marketConfiguration" satisfies Type
        export type Type = typeof Options[number]["value"]
    }

    export namespace GetDataKind {
        export const Options = [
            {
                value:       "openInterest",
                displayName: "Open Interest",
                description: "Fetch open interest for a condition ID.",
            },
            {
                value:       "liveVolume",
                displayName: "Live Volume",
                description: "Fetch live trading volume for an event ID.",
            },
        ] as const

        export const Default = "openInterest" satisfies Type
        export type Type = typeof Options[number]["value"]
    }



    export const Routes = [
        {
            operation: "searchMarkets",
            values:    { action: "search", searchKind: "markets" },
        },
        {
            operation: "publicSearch",
            values:    { action: "search", searchKind: "public" },
        },

        {
            operation: "listMarkets",
            values:    { action: "list", listAPI: "gamma", listGammaKind: "markets" },
        },
        {
            operation: "listEvents",
            values:    { action: "list", listAPI: "gamma", listGammaKind: "events" },
        },
        {
            operation: "listTags",
            values:    { action: "list", listAPI: "gamma", listGammaKind: "tags" },
        },
        {
            operation: "listSeries",
            values:    { action: "list", listAPI: "gamma", listGammaKind: "series" },
        },
        {
            operation: "listComments",
            values:    { action: "list", listAPI: "gamma", listGammaKind: "comments" },
        },
        {
            operation: "listSports",
            values:    { action: "list", listAPI: "gamma", listGammaKind: "sports" },
        },
        {
            operation: "listTeams",
            values:    { action: "list", listAPI: "gamma", listGammaKind: "teams" },
        },
        {
            operation: "listClobMarkets",
            values:    { action: "list", listAPI: "clob", listClobKind: "markets" },
        },
        {
            operation: "listMarketActivity",
            values:    { action: "list", listAPI: "clob", listClobKind: "activity" },
        },
        {
            operation: "listTrades",
            values:    { action: "list", listAPI: "data", listDataKind: "trades" },
        },
        {
            operation: "listHolders",
            values:    { action: "list", listAPI: "data", listDataKind: "holders" },
        },

        {
            operation: "getMarket",
            values:    { action: "get", getAPI: "gamma", getGammaKind: "market" },
        },
        {
            operation: "getEvent",
            values:    { action: "get", getAPI: "gamma", getGammaKind: "event" },
        },
        {
            operation: "getTag",
            values:    { action: "get", getAPI: "gamma", getGammaKind: "tag" },
        },
        {
            operation: "getSeries",
            values:    { action: "get", getAPI: "gamma", getGammaKind: "series" },
        },
        {
            operation: "getClobMarket",
            values:    { action: "get", getAPI: "clob", getClobKind: "marketConfiguration" },
        },
        {
            operation: "getOrderBook",
            values:    { action: "get", getAPI: "clob", getClobKind: "orderBook" },
        },
        {
            operation: "getMidpoint",
            values:    { action: "get", getAPI: "clob", getClobKind: "midpoint" },
        },
        {
            operation: "getPrice",
            values:    { action: "get", getAPI: "clob", getClobKind: "price" },
        },
        {
            operation: "getSpread",
            values:    { action: "get", getAPI: "clob", getClobKind: "spread" },
        },
        {
            operation: "getLastTradePrice",
            values:    { action: "get", getAPI: "clob", getClobKind: "lastTradePrice" },
        },
        {
            operation: "getPriceHistory",
            values:    { action: "get", getAPI: "clob", getClobKind: "priceHistory" },
        },
        {
            operation: "getMarketMechanics",
            values:    { action: "get", getAPI: "clob", getClobKind: "mechanics" },
        },
        {
            operation: "getMarketRewards",
            values:    { action: "get", getAPI: "clob", getClobKind: "rewards" },
        },
        {
            operation: "getOpenInterest",
            values:    { action: "get", getAPI: "data", getDataKind: "openInterest" },
        },
        {
            operation: "getLiveVolume",
            values:    { action: "get", getAPI: "data", getDataKind: "liveVolume" },
        },
    ] as const

    export type Route = typeof Routes[number]

    export namespace Operation {
        export type Type = Route["operation"]
    }



    export function resolve(
        fieldValues: Record<string, unknown>,
    ): Operation.Type {
        const values: Record<string, unknown> = {
            ...fieldValues,
            action:        fieldValues.action        ?? Default,
            searchKind:    fieldValues.searchKind    ?? SearchKind.Default,
            listAPI:       fieldValues.listAPI       ?? ListAPI.Default,
            listGammaKind: fieldValues.listGammaKind ?? ListGammaKind.Default,
            listClobKind:  fieldValues.listClobKind  ?? ListClobKind.Default,
            listDataKind:  fieldValues.listDataKind  ?? ListDataKind.Default,
            getAPI:        fieldValues.getAPI        ?? GetAPI.Default,
            getGammaKind:  fieldValues.getGammaKind  ?? GetGammaKind.Default,
            getClobKind:   fieldValues.getClobKind   ?? GetClobKind.Default,
            getDataKind:   fieldValues.getDataKind   ?? GetDataKind.Default,
        }

        const route = Routes.find(candidate =>
            Object.entries(candidate.values).every(
                ([fieldId, value]) => values[fieldId] === value,
            )
        )

        if (!route)
            throw new Error(
                `Unsupported Polymarket Market selection: ${JSON.stringify(values)}`,
            )

        return route.operation
    }
}

export type MarketLookup = "id" | "slug"
