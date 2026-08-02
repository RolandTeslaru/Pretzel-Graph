import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk"

import { Alpaca } from "@pretzel-graph/nodes/Credentials/Alpaca"


export const Blueprint = defineBlueprint({
    id:              "Integrations.Alpaca.Account",
    credentials:     [Alpaca],
    displayName:     "Alpaca Account",
    description:     "Reads the Alpaca account attached by the credential: balances, positions, orders and history.",
    icon:            "Alpaca",
    accent:          "port-DataList",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        FieldBuilder.MultiOption("resource", "Resource", {
            options: [
                { value: "summary",       displayName: "Account Summary" },
                { value: "configuration", displayName: "Configuration"   },
                { value: "positions",     displayName: "Positions"       },
                { value: "orders",        displayName: "Orders"          },
                { value: "activities",    displayName: "Activities"      },
                { value: "portfolio",     displayName: "Portfolio"       },
                { value: "watchlists",    displayName: "Watchlists"      },
            ],
            initialValue: "summary",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==summary": {
        outputs: [OutputBuilder.Data("account", "Account")],
    },


    "resource==configuration": {
        outputs: [OutputBuilder.Data("configuration", "Configuration")],
    },


    "resource==positions": {
        fields: [
            FieldBuilder.MultiOption("positionsAction", "Action", {
                options: [
                    { value: "list", displayName: "List" },
                    { value: "get",  displayName: "Get"  },
                ],
                initialValue: "list",
                variant:      "tab",
            }),
        ],

        "positionsAction==list": {
            outputs: [OutputBuilder.DataList("positions", "Positions")],
        },

        "positionsAction==get": {
            fields: [
                FieldBuilder.String("positionSymbolOrId", "Symbol or Asset ID", {
                    required:    true,
                    placeholder: "AAPL",
                }),
            ],
            outputs: [OutputBuilder.Data("position", "Position")],
        },
    },


    "resource==orders": {
        fields: [
            FieldBuilder.MultiOption("ordersAction", "Action", {
                options: [
                    { value: "list", displayName: "List" },
                    { value: "get",  displayName: "Get"  },
                ],
                initialValue: "list",
                variant:      "tab",
            }),
        ],

        "ordersAction==list": {
            fields: [
                FieldBuilder.MultiOption("ordersStatus", "Status", {
                    options: [
                        { value: "open",   displayName: "Open"   },
                        { value: "closed", displayName: "Closed" },
                        { value: "all",    displayName: "All"    },
                    ],
                    initialValue: "open",
                }),
                FieldBuilder.List("ordersSymbols", "Symbols", {
                    tooltip: "Optional symbol filter.",
                }),
                FieldBuilder.MultiOption("ordersSide", "Side", {
                    options: [
                        { value: "all",  displayName: "Both" },
                        { value: "buy",  displayName: "Buy"  },
                        { value: "sell", displayName: "Sell" },
                    ],
                    initialValue: "all",
                }),
                FieldBuilder.MultiOption("ordersDirection", "Direction", {
                    options: [
                        { value: "desc", displayName: "Newest First" },
                        { value: "asc",  displayName: "Oldest First" },
                    ],
                    initialValue: "desc",
                    advanced:     true,
                }),
                FieldBuilder.String("ordersAfter", "After", {
                    placeholder: "2026-07-01T00:00:00Z",
                    advanced:    true,
                }),
                FieldBuilder.String("ordersUntil", "Until", {
                    placeholder: "2026-08-01T00:00:00Z",
                    advanced:    true,
                }),
                FieldBuilder.Integer("ordersLimit", "Max Orders", {
                    initialValue: 50,
                    min:          1,
                    max:          500,
                }),
            ],
            outputs: [OutputBuilder.DataList("orders", "Orders")],
        },

        "ordersAction==get": {
            fields: [
                FieldBuilder.String("orderId", "Order ID", { required: true }),
            ],
            outputs: [OutputBuilder.Data("order", "Order")],
        },
    },


    "resource==activities": {
        fields: [
            FieldBuilder.List("activityTypes", "Activity Types", {
                tooltip: "Optional Alpaca activity codes, e.g. FILL, DIV, FEE.",
            }),
            FieldBuilder.MultiOption("activityCategory", "Category", {
                options: [
                    { value: "all",                displayName: "All"       },
                    { value: "trade_activity",     displayName: "Trades"    },
                    { value: "non_trade_activity", displayName: "Non-trade" },
                ],
                initialValue: "all",
            }),
            FieldBuilder.MultiOption("activityDirection", "Direction", {
                options: [
                    { value: "desc", displayName: "Newest First" },
                    { value: "asc",  displayName: "Oldest First" },
                ],
                initialValue: "desc",
            }),
            FieldBuilder.String("activityAfter", "After", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            FieldBuilder.String("activityUntil", "Until", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            FieldBuilder.Integer("activityLimit", "Max Activities", {
                initialValue: 50,
                min:          1,
                max:          500,
            }),
        ],
        outputs: [OutputBuilder.DataList("activities", "Activities")],
    },


    "resource==portfolio": {
        fields: [
            FieldBuilder.String("portfolioPeriod", "Period", {
                initialValue: "1M",
                tooltip:      "Examples: 1D, 1M, 3M, 1A or all.",
            }),
            FieldBuilder.String("portfolioTimeframe", "Timeframe", {
                initialValue: "1D",
                tooltip:      "Examples: 1Min, 5Min, 1H or 1D.",
            }),
            FieldBuilder.String("portfolioStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            FieldBuilder.String("portfolioEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            FieldBuilder.Boolean("portfolioExtendedHours", "Extended Hours", {
                initialValue: false,
            }),
        ],
        outputs: [OutputBuilder.Data("portfolio", "Portfolio History")],
    },


    "resource==watchlists": {
        fields: [
            FieldBuilder.MultiOption("watchlistsAction", "Action", {
                options: [
                    { value: "list", displayName: "List" },
                    { value: "get",  displayName: "Get"  },
                ],
                initialValue: "list",
                variant:      "tab",
            }),
        ],

        "watchlistsAction==list": {
            outputs: [OutputBuilder.DataList("watchlists", "Watchlists")],
        },

        "watchlistsAction==get": {
            fields: [
                FieldBuilder.String("watchlistId", "Watchlist ID", {
                    tooltip: "Provide an ID, or leave empty and use Name.",
                }),
                FieldBuilder.String("watchlistName", "Watchlist Name"),
            ],
            outputs: [OutputBuilder.Data("watchlist", "Watchlist")],
        },
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Alpaca Account Tools")],
    }),
})
