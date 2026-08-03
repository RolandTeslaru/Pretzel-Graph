import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
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
        FieldBuilder.MultiOption("resource", "Resource", {
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
            FieldBuilder.MultiOption("assetsAction", "Action", {
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
                FieldBuilder.String("assetsQuery", "Search", {
                    placeholder: "Apple or AAPL",
                    tooltip:     "Optional local symbol/name filter over Alpaca's asset catalogue.",
                }),
                FieldBuilder.MultiOption("assetsStatus", "Status", {
                    options: [
                        { value: "active",   displayName: "Active"   },
                        { value: "inactive", displayName: "Inactive" },
                    ],
                    initialValue: "active",
                }),
                FieldBuilder.MultiOption("assetsClass", "Asset Class", {
                    options: [
                        { value: "all",       displayName: "All"        },
                        { value: "us_equity", displayName: "US Equity"  },
                        { value: "crypto",    displayName: "Crypto"     },
                        { value: "us_option", displayName: "US Option"  },
                    ],
                    initialValue: "us_equity",
                }),
                FieldBuilder.String("assetsExchange", "Exchange", {
                    placeholder: "NASDAQ",
                    advanced:    true,
                }),
                FieldBuilder.Integer("assetsLimit", "Max Results", {
                    initialValue: 20,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [OutputBuilder.DataList("assets", "Assets")],
        },

        "assetsAction==get": {
            fields: [
                FieldBuilder.String("assetSymbolOrId", "Symbol or Asset ID", {
                    required:    true,
                    placeholder: "AAPL",
                }),
            ],
            outputs: [OutputBuilder.Data("asset", "Asset")],
        },
    },


    "resource==clock": {
        outputs: [OutputBuilder.Data("clock", "Market Clock")],
    },


    "resource==calendar": {
        fields: [
            FieldBuilder.CalendarRange("calendarRange", "Date Range", {
                placeholder: "Choose trading days",
            }),
            FieldBuilder.Integer("calendarLimit", "Max Days", {
                initialValue: 30,
                min:          1,
                max:          1_000,
            }),
        ],
        outputs: [OutputBuilder.DataList("calendar", "Calendar")],
    },


    "resource==bars": {
        fields: [
            FieldBuilder.MultiOption("barsAssetClass", "Asset Class", {
                options:      assetClassOptions,
                initialValue: "stock",
                variant:      "tab",
            }),
            FieldBuilder.String("barsSymbol", "Symbol", {
                required:    true,
                placeholder: "AAPL, BTC/USD, or AAPL260116C00200000",
            }),
            FieldBuilder.MultiOption("barsUnit", "Timeframe", {
                options:      timeframeOptions,
                initialValue: "hour",
            }),
            FieldBuilder.Integer("barsMultiplier", "Multiplier", {
                initialValue: 1,
                min:          1,
                max:          59,
            }),
            FieldBuilder.String("barsStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            FieldBuilder.String("barsEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            FieldBuilder.Integer("barsLimit", "Max Bars", {
                initialValue: 200,
                min:          1,
                max:          5_000,
            }),
            FieldBuilder.MultiOption("barsFeed", "Stock Feed", {
                options:      stockFeedOptions,
                initialValue: "iex",
                advanced:     true,
                tooltip:      "Used only for stocks.",
            }),
        ],
        outputs: [OutputBuilder.DataList("bars", "Bars")],
    },


    "resource==trades": {
        fields: [
            FieldBuilder.MultiOption("tradesAssetClass", "Asset Class", {
                options:      assetClassOptions,
                initialValue: "stock",
                variant:      "tab",
            }),
            FieldBuilder.String("tradesSymbol", "Symbol", {
                required: true,
            }),
            FieldBuilder.String("tradesStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            FieldBuilder.String("tradesEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            FieldBuilder.Integer("tradesLimit", "Max Trades", {
                initialValue: 100,
                min:          1,
                max:          1_000,
            }),
            FieldBuilder.MultiOption("tradesFeed", "Stock Feed", {
                options:      stockFeedOptions,
                initialValue: "iex",
                advanced:     true,
                tooltip:      "Used only for stocks.",
            }),
        ],
        outputs: [OutputBuilder.DataList("trades", "Trades")],
    },


    "resource==quotes": {
        fields: [
            FieldBuilder.MultiOption("quotesAssetClass", "Asset Class", {
                options: [
                    { value: "stock",  displayName: "Stock"  },
                    { value: "crypto", displayName: "Crypto" },
                ],
                initialValue: "stock",
                variant:      "tab",
            }),
            FieldBuilder.String("quotesSymbol", "Symbol", { required: true }),
            FieldBuilder.String("quotesStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            FieldBuilder.String("quotesEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            FieldBuilder.Integer("quotesLimit", "Max Quotes", {
                initialValue: 100,
                min:          1,
                max:          1_000,
            }),
            FieldBuilder.MultiOption("quotesFeed", "Stock Feed", {
                options:      stockFeedOptions,
                initialValue: "iex",
                advanced:     true,
                tooltip:      "Used only for stocks.",
            }),
        ],
        outputs: [OutputBuilder.DataList("quotes", "Quotes")],
    },


    "resource==snapshot": {
        fields: [
            FieldBuilder.MultiOption("snapshotAssetClass", "Asset Class", {
                options: [
                    { value: "stock",  displayName: "Stock"  },
                    { value: "crypto", displayName: "Crypto" },
                ],
                initialValue: "stock",
                variant:      "tab",
            }),
            FieldBuilder.String("snapshotSymbol", "Symbol", { required: true }),
            FieldBuilder.MultiOption("snapshotFeed", "Stock Feed", {
                options:      stockFeedOptions,
                initialValue: "iex",
                advanced:     true,
                tooltip:      "Used only for stocks.",
            }),
        ],
        outputs: [OutputBuilder.Data("snapshot", "Snapshot")],
    },


    "resource==news": {
        fields: [
            FieldBuilder.List("newsSymbols", "Symbols", {
                tooltip: "Optional. Leave empty for recent market-wide news.",
            }),
            FieldBuilder.String("newsStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            FieldBuilder.String("newsEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            FieldBuilder.Integer("newsLimit", "Max Articles", {
                initialValue: 10,
                min:          1,
                max:          100,
            }),
        ],
        outputs: [OutputBuilder.DataList("news", "News")],
    },


    "resource==options": {
        fields: [
            FieldBuilder.MultiOption("optionsAction", "Action", {
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
                FieldBuilder.List("contractsUnderlyings", "Underlying Symbols", {
                    tooltip: "Optional symbols such as AAPL or SPY.",
                }),
                FieldBuilder.MultiOption("contractsStatus", "Status", {
                    options: [
                        { value: "active",   displayName: "Active"   },
                        { value: "inactive", displayName: "Inactive" },
                    ],
                    initialValue: "active",
                }),
                FieldBuilder.MultiOption("contractsType", "Type", {
                    options: [
                        { value: "all",  displayName: "Calls & Puts" },
                        { value: "call", displayName: "Calls"        },
                        { value: "put",  displayName: "Puts"         },
                    ],
                    initialValue: "all",
                }),
                FieldBuilder.String("contractsExpiration", "Expiration Date", {
                    placeholder: "2026-12-18",
                }),
                FieldBuilder.Integer("contractsLimit", "Max Contracts", {
                    initialValue: 50,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [OutputBuilder.DataList("contracts", "Option Contracts")],
        },

        "optionsAction==getContract": {
            fields: [
                FieldBuilder.String("contractSymbolOrId", "Contract Symbol or ID", {
                    required: true,
                }),
            ],
            outputs: [OutputBuilder.Data("contract", "Option Contract")],
        },

        "optionsAction==chain": {
            fields: [
                FieldBuilder.String("chainUnderlying", "Underlying Symbol", {
                    required:    true,
                    placeholder: "AAPL",
                }),
                FieldBuilder.MultiOption("chainType", "Type", {
                    options: [
                        { value: "all",  displayName: "Calls & Puts" },
                        { value: "call", displayName: "Calls"        },
                        { value: "put",  displayName: "Puts"         },
                    ],
                    initialValue: "all",
                }),
                FieldBuilder.String("chainExpiration", "Expiration Date", {
                    placeholder: "2026-12-18",
                }),
                FieldBuilder.Float("chainStrikeFrom", "Minimum Strike", {
                    min:      0,
                    advanced: true,
                }),
                FieldBuilder.Float("chainStrikeTo", "Maximum Strike", {
                    min:      0,
                    advanced: true,
                }),
                FieldBuilder.Integer("chainLimit", "Max Contracts", {
                    initialValue: 50,
                    min:          1,
                    max:          500,
                }),
            ],
            outputs: [OutputBuilder.DataList("chain", "Option Chain")],
        },
    },


    "resource==screener": {
        fields: [
            FieldBuilder.MultiOption("screenerView", "View", {
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
                FieldBuilder.MultiOption("activeBy", "Rank By", {
                    options: [
                        { value: "volume", displayName: "Volume" },
                        { value: "trades", displayName: "Trades" },
                    ],
                    initialValue: "volume",
                }),
                FieldBuilder.Integer("activeLimit", "Max Results", {
                    initialValue: 10,
                    min:          1,
                    max:          100,
                }),
            ],
            outputs: [OutputBuilder.Data("active", "Most Active")],
        },

        "screenerView==movers": {
            fields: [
                FieldBuilder.MultiOption("moversMarket", "Market", {
                    options: [
                        { value: "stocks", displayName: "Stocks" },
                        { value: "crypto", displayName: "Crypto" },
                    ],
                    initialValue: "stocks",
                }),
                FieldBuilder.Integer("moversLimit", "Max Per Side", {
                    initialValue: 10,
                    min:          1,
                    max:          100,
                }),
            ],
            outputs: [OutputBuilder.Data("movers", "Movers")],
        },
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Alpaca Market Tools")],
    }),
})
