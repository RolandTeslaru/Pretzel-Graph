import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk"

import { Alpaca } from "@pretzel-graph/nodes/Credentials/Alpaca"


const assetClassOptions = [
    { value: "stock",  displayName: "Stock"  },
    { value: "crypto", displayName: "Crypto" },
    { value: "option", displayName: "Option" },
] as const

const stockFeedOptions = [
    { value: "iex",   displayName: "IEX", description: "Available on the basic data plan." },
    { value: "sip",   displayName: "SIP", description: "Consolidated US feed; subscription may be required." },
    { value: "otc",   displayName: "OTC" },
    { value: "boats", displayName: "Overnight" },
] as const

const timeframeOptions = [
    { value: "minute", displayName: "Minute" },
    { value: "hour",   displayName: "Hour"   },
    { value: "day",    displayName: "Day"    },
    { value: "week",   displayName: "Week"   },
    { value: "month",  displayName: "Month"  },
] as const


export const Blueprint = defineBlueprint({
    id:              "Integrations.Alpaca.Market",
    credentials:     [Alpaca],
    displayName:     "Alpaca Market",
    description:     "Reads Alpaca instruments, stock/crypto/option prices, news and market status.",
    icon:            "Alpaca",
    accent:          "port-DataList",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        defineField.MultiOption("resource", "Resource", {
            options: [
                { value: "assets",          displayName: "Assets"          },
                { value: "clock",           displayName: "Market Clock"    },
                { value: "calendar",        displayName: "Calendar"        },
                { value: "bars",            displayName: "Bars"            },
                { value: "trades",          displayName: "Trades"          },
                { value: "quotes",          displayName: "Quotes"          },
                { value: "snapshot",        displayName: "Snapshot"        },
                { value: "news",            displayName: "News"            },
                { value: "options",         displayName: "Options"         },
                { value: "screener",        displayName: "Screener"        },
            ],
            initialValue: "assets",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==assets": {
        fields: [
            defineField.MultiOption("assetsAction", "Action", {
                options: [
                    { value: "list", displayName: "List" },
                    { value: "get",  displayName: "Get"  },
                ],
                initialValue: "list",
                variant:      "tab",
            }),
        ],

        "assetsAction==list": {
            fields: [
                defineField.String("assetsQuery", "Search", {
                    placeholder: "Apple or AAPL",
                    tooltip:     "Optional local symbol/name filter over Alpaca's asset catalogue.",
                }),
                defineField.MultiOption("assetsStatus", "Status", {
                    options: [
                        { value: "active",   displayName: "Active"   },
                        { value: "inactive", displayName: "Inactive" },
                    ],
                    initialValue: "active",
                }),
                defineField.MultiOption("assetsClass", "Asset Class", {
                    options: [
                        { value: "all",       displayName: "All"        },
                        { value: "us_equity", displayName: "US Equity"  },
                        { value: "crypto",    displayName: "Crypto"     },
                        { value: "us_option", displayName: "US Option"  },
                    ],
                    initialValue: "us_equity",
                }),
                defineField.String("assetsExchange", "Exchange", {
                    placeholder: "NASDAQ",
                    advanced:    true,
                }),
                defineField.Integer("assetsLimit", "Max Results", {
                    initialValue: 20,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [defineOutput.DataList("assets", "Assets")],
        },

        "assetsAction==get": {
            fields: [
                defineField.String("assetSymbolOrId", "Symbol or Asset ID", {
                    required:    true,
                    placeholder: "AAPL",
                }),
            ],
            outputs: [defineOutput.Data("asset", "Asset")],
        },
    },


    "resource==clock": {
        outputs: [defineOutput.Data("clock", "Market Clock")],
    },


    "resource==calendar": {
        fields: [
            defineField.CalendarRange("calendarRange", "Date Range", {
                placeholder: "Choose trading days",
            }),
            defineField.Integer("calendarLimit", "Max Days", {
                initialValue: 30,
                min:          1,
                max:          1_000,
            }),
        ],
        outputs: [defineOutput.DataList("calendar", "Calendar")],
    },


    "resource==bars": {
        fields: [
            defineField.MultiOption("barsAssetClass", "Asset Class", {
                options:      assetClassOptions,
                initialValue: "stock",
                variant:      "tab",
            }),
            defineField.String("barsSymbol", "Symbol", {
                required:    true,
                placeholder: "AAPL, BTC/USD, or AAPL260116C00200000",
            }),
            defineField.MultiOption("barsUnit", "Timeframe", {
                options:      timeframeOptions,
                initialValue: "hour",
            }),
            defineField.Integer("barsMultiplier", "Multiplier", {
                initialValue: 1,
                min:          1,
                max:          59,
            }),
            defineField.String("barsStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            defineField.String("barsEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            defineField.Integer("barsLimit", "Max Bars", {
                initialValue: 200,
                min:          1,
                max:          5_000,
            }),
            defineField.MultiOption("barsFeed", "Stock Feed", {
                options:      stockFeedOptions,
                initialValue: "iex",
                advanced:     true,
                tooltip:      "Used only for stocks.",
            }),
        ],
        outputs: [defineOutput.DataList("bars", "Bars")],
    },


    "resource==trades": {
        fields: [
            defineField.MultiOption("tradesAssetClass", "Asset Class", {
                options:      assetClassOptions,
                initialValue: "stock",
                variant:      "tab",
            }),
            defineField.String("tradesSymbol", "Symbol", {
                required: true,
            }),
            defineField.String("tradesStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            defineField.String("tradesEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            defineField.Integer("tradesLimit", "Max Trades", {
                initialValue: 100,
                min:          1,
                max:          1_000,
            }),
            defineField.MultiOption("tradesFeed", "Stock Feed", {
                options:      stockFeedOptions,
                initialValue: "iex",
                advanced:     true,
                tooltip:      "Used only for stocks.",
            }),
        ],
        outputs: [defineOutput.DataList("trades", "Trades")],
    },


    "resource==quotes": {
        fields: [
            defineField.MultiOption("quotesAssetClass", "Asset Class", {
                options: [
                    { value: "stock",  displayName: "Stock"  },
                    { value: "crypto", displayName: "Crypto" },
                ],
                initialValue: "stock",
                variant:      "tab",
            }),
            defineField.String("quotesSymbol", "Symbol", { required: true }),
            defineField.String("quotesStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            defineField.String("quotesEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            defineField.Integer("quotesLimit", "Max Quotes", {
                initialValue: 100,
                min:          1,
                max:          1_000,
            }),
            defineField.MultiOption("quotesFeed", "Stock Feed", {
                options:      stockFeedOptions,
                initialValue: "iex",
                advanced:     true,
                tooltip:      "Used only for stocks.",
            }),
        ],
        outputs: [defineOutput.DataList("quotes", "Quotes")],
    },


    "resource==snapshot": {
        fields: [
            defineField.MultiOption("snapshotAssetClass", "Asset Class", {
                options: [
                    { value: "stock",  displayName: "Stock"  },
                    { value: "crypto", displayName: "Crypto" },
                ],
                initialValue: "stock",
                variant:      "tab",
            }),
            defineField.String("snapshotSymbol", "Symbol", { required: true }),
            defineField.MultiOption("snapshotFeed", "Stock Feed", {
                options:      stockFeedOptions,
                initialValue: "iex",
                advanced:     true,
                tooltip:      "Used only for stocks.",
            }),
        ],
        outputs: [defineOutput.Data("snapshot", "Snapshot")],
    },


    "resource==news": {
        fields: [
            defineField.List("newsSymbols", "Symbols", {
                tooltip: "Optional. Leave empty for recent market-wide news.",
            }),
            defineField.String("newsStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            defineField.String("newsEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            defineField.Integer("newsLimit", "Max Articles", {
                initialValue: 10,
                min:          1,
                max:          100,
            }),
        ],
        outputs: [defineOutput.DataList("news", "News")],
    },


    "resource==options": {
        fields: [
            defineField.MultiOption("optionsAction", "Action", {
                options: [
                    { value: "listContracts", displayName: "List Contracts" },
                    { value: "getContract",   displayName: "Get Contract"   },
                    { value: "chain",         displayName: "Option Chain"   },
                ],
                initialValue: "listContracts",
            }),
        ],

        "optionsAction==listContracts": {
            fields: [
                defineField.List("contractsUnderlyings", "Underlying Symbols", {
                    tooltip: "Optional symbols such as AAPL or SPY.",
                }),
                defineField.MultiOption("contractsStatus", "Status", {
                    options: [
                        { value: "active",   displayName: "Active"   },
                        { value: "inactive", displayName: "Inactive" },
                    ],
                    initialValue: "active",
                }),
                defineField.MultiOption("contractsType", "Type", {
                    options: [
                        { value: "all",  displayName: "Calls & Puts" },
                        { value: "call", displayName: "Calls"        },
                        { value: "put",  displayName: "Puts"         },
                    ],
                    initialValue: "all",
                }),
                defineField.String("contractsExpiration", "Expiration Date", {
                    placeholder: "2026-12-18",
                }),
                defineField.Integer("contractsLimit", "Max Contracts", {
                    initialValue: 50,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [defineOutput.DataList("contracts", "Option Contracts")],
        },

        "optionsAction==getContract": {
            fields: [
                defineField.String("contractSymbolOrId", "Contract Symbol or ID", {
                    required: true,
                }),
            ],
            outputs: [defineOutput.Data("contract", "Option Contract")],
        },

        "optionsAction==chain": {
            fields: [
                defineField.String("chainUnderlying", "Underlying Symbol", {
                    required:    true,
                    placeholder: "AAPL",
                }),
                defineField.MultiOption("chainType", "Type", {
                    options: [
                        { value: "all",  displayName: "Calls & Puts" },
                        { value: "call", displayName: "Calls"        },
                        { value: "put",  displayName: "Puts"         },
                    ],
                    initialValue: "all",
                }),
                defineField.String("chainExpiration", "Expiration Date", {
                    placeholder: "2026-12-18",
                }),
                defineField.Float("chainStrikeFrom", "Minimum Strike", {
                    min:      0,
                    advanced: true,
                }),
                defineField.Float("chainStrikeTo", "Maximum Strike", {
                    min:      0,
                    advanced: true,
                }),
                defineField.Integer("chainLimit", "Max Contracts", {
                    initialValue: 50,
                    min:          1,
                    max:          500,
                }),
            ],
            outputs: [defineOutput.DataList("chain", "Option Chain")],
        },
    },


    "resource==screener": {
        fields: [
            defineField.MultiOption("screenerView", "View", {
                options: [
                    { value: "mostActive", displayName: "Most Active" },
                    { value: "movers",     displayName: "Movers"      },
                ],
                initialValue: "mostActive",
                variant:      "tab",
            }),
        ],

        "screenerView==mostActive": {
            fields: [
                defineField.MultiOption("activeBy", "Rank By", {
                    options: [
                        { value: "volume", displayName: "Volume" },
                        { value: "trades", displayName: "Trades" },
                    ],
                    initialValue: "volume",
                }),
                defineField.Integer("activeLimit", "Max Results", {
                    initialValue: 10,
                    min:          1,
                    max:          100,
                }),
            ],
            outputs: [defineOutput.Data("active", "Most Active")],
        },

        "screenerView==movers": {
            fields: [
                defineField.MultiOption("moversMarket", "Market", {
                    options: [
                        { value: "stocks", displayName: "Stocks" },
                        { value: "crypto", displayName: "Crypto" },
                    ],
                    initialValue: "stocks",
                }),
                defineField.Integer("moversLimit", "Max Per Side", {
                    initialValue: 10,
                    min:          1,
                    max:          100,
                }),
            ],
            outputs: [defineOutput.Data("movers", "Movers")],
        },
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Alpaca Market Tools")],
    }),
})
