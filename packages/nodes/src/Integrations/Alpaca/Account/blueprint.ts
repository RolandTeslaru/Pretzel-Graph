import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
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
        defineField.MultiOption("resource", "Resource", {
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
        outputs: [defineOutput.Data("account", "Account")],
    },


    "resource==configuration": {
        outputs: [defineOutput.Data("configuration", "Configuration")],
    },


    "resource==positions": {
        fields: [
            defineField.MultiOption("positionsAction", "Action", {
                options: [
                    { value: "list", displayName: "List" },
                    { value: "get",  displayName: "Get"  },
                ],
                initialValue: "list",
                variant:      "tab",
            }),
        ],

        "positionsAction==list": {
            outputs: [defineOutput.DataList("positions", "Positions")],
        },

        "positionsAction==get": {
            fields: [
                defineField.String("positionSymbolOrId", "Symbol or Asset ID", {
                    required:    true,
                    placeholder: "AAPL",
                }),
            ],
            outputs: [defineOutput.Data("position", "Position")],
        },
    },


    "resource==orders": {
        fields: [
            defineField.MultiOption("ordersAction", "Action", {
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
                defineField.MultiOption("ordersStatus", "Status", {
                    options: [
                        { value: "open",   displayName: "Open"   },
                        { value: "closed", displayName: "Closed" },
                        { value: "all",    displayName: "All"    },
                    ],
                    initialValue: "open",
                }),
                defineField.List("ordersSymbols", "Symbols", {
                    tooltip: "Optional symbol filter.",
                }),
                defineField.MultiOption("ordersSide", "Side", {
                    options: [
                        { value: "all",  displayName: "Both" },
                        { value: "buy",  displayName: "Buy"  },
                        { value: "sell", displayName: "Sell" },
                    ],
                    initialValue: "all",
                }),
                defineField.MultiOption("ordersDirection", "Direction", {
                    options: [
                        { value: "desc", displayName: "Newest First" },
                        { value: "asc",  displayName: "Oldest First" },
                    ],
                    initialValue: "desc",
                    advanced:     true,
                }),
                defineField.String("ordersAfter", "After", {
                    placeholder: "2026-07-01T00:00:00Z",
                    advanced:    true,
                }),
                defineField.String("ordersUntil", "Until", {
                    placeholder: "2026-08-01T00:00:00Z",
                    advanced:    true,
                }),
                defineField.Integer("ordersLimit", "Max Orders", {
                    initialValue: 50,
                    min:          1,
                    max:          500,
                }),
            ],
            outputs: [defineOutput.DataList("orders", "Orders")],
        },

        "ordersAction==get": {
            fields: [
                defineField.String("orderId", "Order ID", { required: true }),
            ],
            outputs: [defineOutput.Data("order", "Order")],
        },
    },


    "resource==activities": {
        fields: [
            defineField.List("activityTypes", "Activity Types", {
                tooltip: "Optional Alpaca activity codes, e.g. FILL, DIV, FEE.",
            }),
            defineField.MultiOption("activityCategory", "Category", {
                options: [
                    { value: "all",                displayName: "All"       },
                    { value: "trade_activity",     displayName: "Trades"    },
                    { value: "non_trade_activity", displayName: "Non-trade" },
                ],
                initialValue: "all",
            }),
            defineField.MultiOption("activityDirection", "Direction", {
                options: [
                    { value: "desc", displayName: "Newest First" },
                    { value: "asc",  displayName: "Oldest First" },
                ],
                initialValue: "desc",
            }),
            defineField.String("activityAfter", "After", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            defineField.String("activityUntil", "Until", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            defineField.Integer("activityLimit", "Max Activities", {
                initialValue: 50,
                min:          1,
                max:          500,
            }),
        ],
        outputs: [defineOutput.DataList("activities", "Activities")],
    },


    "resource==portfolio": {
        fields: [
            defineField.String("portfolioPeriod", "Period", {
                initialValue: "1M",
                tooltip:      "Examples: 1D, 1M, 3M, 1A or all.",
            }),
            defineField.String("portfolioTimeframe", "Timeframe", {
                initialValue: "1D",
                tooltip:      "Examples: 1Min, 5Min, 1H or 1D.",
            }),
            defineField.String("portfolioStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            defineField.String("portfolioEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            defineField.Boolean("portfolioExtendedHours", "Extended Hours", {
                initialValue: false,
            }),
        ],
        outputs: [defineOutput.Data("portfolio", "Portfolio History")],
    },


    "resource==watchlists": {
        fields: [
            defineField.MultiOption("watchlistsAction", "Action", {
                options: [
                    { value: "list", displayName: "List" },
                    { value: "get",  displayName: "Get"  },
                ],
                initialValue: "list",
                variant:      "tab",
            }),
        ],

        "watchlistsAction==list": {
            outputs: [defineOutput.DataList("watchlists", "Watchlists")],
        },

        "watchlistsAction==get": {
            fields: [
                defineField.String("watchlistId", "Watchlist ID", {
                    tooltip: "Provide an ID, or leave empty and use Name.",
                }),
                defineField.String("watchlistName", "Watchlist Name"),
            ],
            outputs: [defineOutput.Data("watchlist", "Watchlist")],
        },
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Alpaca Account Tools")],
    }),
})
