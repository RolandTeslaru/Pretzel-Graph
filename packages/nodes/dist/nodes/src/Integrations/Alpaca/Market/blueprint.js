"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const Alpaca_1 = require("../../../Credentials/Alpaca");
const assetClassOptions = [
    { value: "stock", displayName: "Stock" },
    { value: "crypto", displayName: "Crypto" },
    { value: "option", displayName: "Option" },
];
const stockFeedOptions = [
    { value: "iex", displayName: "IEX", description: "Available on the basic data plan." },
    { value: "sip", displayName: "SIP", description: "Consolidated US feed; subscription may be required." },
    { value: "otc", displayName: "OTC" },
    { value: "boats", displayName: "Overnight" },
];
const timeframeOptions = [
    { value: "minute", displayName: "Minute" },
    { value: "hour", displayName: "Hour" },
    { value: "day", displayName: "Day" },
    { value: "week", displayName: "Week" },
    { value: "month", displayName: "Month" },
];
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Alpaca.Market",
    credentials: [Alpaca_1.Alpaca],
    displayName: "Alpaca Market",
    description: "Reads Alpaca instruments, stock/crypto/option prices, news and market status.",
    icon: "Alpaca",
    accent: "port-DataList",
    proxyCompatible: true,
    toolCompatible: true,
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("resource", "Resource", {
            options: [
                { value: "assets", displayName: "Assets" },
                { value: "clock", displayName: "Market Clock" },
                { value: "calendar", displayName: "Calendar" },
                { value: "bars", displayName: "Bars" },
                { value: "trades", displayName: "Trades" },
                { value: "quotes", displayName: "Quotes" },
                { value: "snapshot", displayName: "Snapshot" },
                { value: "news", displayName: "News" },
                { value: "options", displayName: "Options" },
                { value: "screener", displayName: "Screener" },
            ],
            initialValue: "assets",
        }),
    ],
    inputs: [],
    outputs: [],
    "resource==assets": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("assetsAction", "Action", {
                options: [
                    { value: "list", displayName: "List" },
                    { value: "get", displayName: "Get" },
                ],
                initialValue: "list",
                variant: "tab",
            }),
        ],
        "assetsAction==list": {
            fields: [
                node_sdk_1.FieldBuilder.String("assetsQuery", "Search", {
                    placeholder: "Apple or AAPL",
                    tooltip: "Optional local symbol/name filter over Alpaca's asset catalogue.",
                }),
                node_sdk_1.FieldBuilder.MultiOption("assetsStatus", "Status", {
                    options: [
                        { value: "active", displayName: "Active" },
                        { value: "inactive", displayName: "Inactive" },
                    ],
                    initialValue: "active",
                }),
                node_sdk_1.FieldBuilder.MultiOption("assetsClass", "Asset Class", {
                    options: [
                        { value: "all", displayName: "All" },
                        { value: "us_equity", displayName: "US Equity" },
                        { value: "crypto", displayName: "Crypto" },
                        { value: "us_option", displayName: "US Option" },
                    ],
                    initialValue: "us_equity",
                }),
                node_sdk_1.FieldBuilder.String("assetsExchange", "Exchange", {
                    placeholder: "NASDAQ",
                    advanced: true,
                }),
                node_sdk_1.FieldBuilder.Integer("assetsLimit", "Max Results", {
                    initialValue: 20,
                    min: 1,
                    max: 1_000,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("assets", "Assets")],
        },
        "assetsAction==get": {
            fields: [
                node_sdk_1.FieldBuilder.String("assetSymbolOrId", "Symbol or Asset ID", {
                    required: true,
                    placeholder: "AAPL",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("asset", "Asset")],
        },
    },
    "resource==clock": {
        outputs: [node_sdk_1.OutputBuilder.Data("clock", "Market Clock")],
    },
    "resource==calendar": {
        fields: [
            node_sdk_1.FieldBuilder.CalendarRange("calendarRange", "Date Range", {
                placeholder: "Choose trading days",
            }),
            node_sdk_1.FieldBuilder.Integer("calendarLimit", "Max Days", {
                initialValue: 30,
                min: 1,
                max: 1_000,
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.DataList("calendar", "Calendar")],
    },
    "resource==bars": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("barsAssetClass", "Asset Class", {
                options: assetClassOptions,
                initialValue: "stock",
                variant: "tab",
            }),
            node_sdk_1.FieldBuilder.String("barsSymbol", "Symbol", {
                required: true,
                placeholder: "AAPL, BTC/USD, or AAPL260116C00200000",
            }),
            node_sdk_1.FieldBuilder.MultiOption("barsUnit", "Timeframe", {
                options: timeframeOptions,
                initialValue: "hour",
            }),
            node_sdk_1.FieldBuilder.Integer("barsMultiplier", "Multiplier", {
                initialValue: 1,
                min: 1,
                max: 59,
            }),
            node_sdk_1.FieldBuilder.String("barsStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.String("barsEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.Integer("barsLimit", "Max Bars", {
                initialValue: 200,
                min: 1,
                max: 5_000,
            }),
            node_sdk_1.FieldBuilder.MultiOption("barsFeed", "Stock Feed", {
                options: stockFeedOptions,
                initialValue: "iex",
                advanced: true,
                tooltip: "Used only for stocks.",
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.DataList("bars", "Bars")],
    },
    "resource==trades": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("tradesAssetClass", "Asset Class", {
                options: assetClassOptions,
                initialValue: "stock",
                variant: "tab",
            }),
            node_sdk_1.FieldBuilder.String("tradesSymbol", "Symbol", {
                required: true,
            }),
            node_sdk_1.FieldBuilder.String("tradesStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.String("tradesEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.Integer("tradesLimit", "Max Trades", {
                initialValue: 100,
                min: 1,
                max: 1_000,
            }),
            node_sdk_1.FieldBuilder.MultiOption("tradesFeed", "Stock Feed", {
                options: stockFeedOptions,
                initialValue: "iex",
                advanced: true,
                tooltip: "Used only for stocks.",
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.DataList("trades", "Trades")],
    },
    "resource==quotes": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("quotesAssetClass", "Asset Class", {
                options: [
                    { value: "stock", displayName: "Stock" },
                    { value: "crypto", displayName: "Crypto" },
                ],
                initialValue: "stock",
                variant: "tab",
            }),
            node_sdk_1.FieldBuilder.String("quotesSymbol", "Symbol", { required: true }),
            node_sdk_1.FieldBuilder.String("quotesStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.String("quotesEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.Integer("quotesLimit", "Max Quotes", {
                initialValue: 100,
                min: 1,
                max: 1_000,
            }),
            node_sdk_1.FieldBuilder.MultiOption("quotesFeed", "Stock Feed", {
                options: stockFeedOptions,
                initialValue: "iex",
                advanced: true,
                tooltip: "Used only for stocks.",
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.DataList("quotes", "Quotes")],
    },
    "resource==snapshot": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("snapshotAssetClass", "Asset Class", {
                options: [
                    { value: "stock", displayName: "Stock" },
                    { value: "crypto", displayName: "Crypto" },
                ],
                initialValue: "stock",
                variant: "tab",
            }),
            node_sdk_1.FieldBuilder.String("snapshotSymbol", "Symbol", { required: true }),
            node_sdk_1.FieldBuilder.MultiOption("snapshotFeed", "Stock Feed", {
                options: stockFeedOptions,
                initialValue: "iex",
                advanced: true,
                tooltip: "Used only for stocks.",
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.Data("snapshot", "Snapshot")],
    },
    "resource==news": {
        fields: [
            node_sdk_1.FieldBuilder.List("newsSymbols", "Symbols", {
                tooltip: "Optional. Leave empty for recent market-wide news.",
            }),
            node_sdk_1.FieldBuilder.String("newsStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.String("newsEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.Integer("newsLimit", "Max Articles", {
                initialValue: 10,
                min: 1,
                max: 100,
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.DataList("news", "News")],
    },
    "resource==options": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("optionsAction", "Action", {
                options: [
                    { value: "listContracts", displayName: "List Contracts" },
                    { value: "getContract", displayName: "Get Contract" },
                    { value: "chain", displayName: "Option Chain" },
                ],
                initialValue: "listContracts",
            }),
        ],
        "optionsAction==listContracts": {
            fields: [
                node_sdk_1.FieldBuilder.List("contractsUnderlyings", "Underlying Symbols", {
                    tooltip: "Optional symbols such as AAPL or SPY.",
                }),
                node_sdk_1.FieldBuilder.MultiOption("contractsStatus", "Status", {
                    options: [
                        { value: "active", displayName: "Active" },
                        { value: "inactive", displayName: "Inactive" },
                    ],
                    initialValue: "active",
                }),
                node_sdk_1.FieldBuilder.MultiOption("contractsType", "Type", {
                    options: [
                        { value: "all", displayName: "Calls & Puts" },
                        { value: "call", displayName: "Calls" },
                        { value: "put", displayName: "Puts" },
                    ],
                    initialValue: "all",
                }),
                node_sdk_1.FieldBuilder.String("contractsExpiration", "Expiration Date", {
                    placeholder: "2026-12-18",
                }),
                node_sdk_1.FieldBuilder.Integer("contractsLimit", "Max Contracts", {
                    initialValue: 50,
                    min: 1,
                    max: 1_000,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("contracts", "Option Contracts")],
        },
        "optionsAction==getContract": {
            fields: [
                node_sdk_1.FieldBuilder.String("contractSymbolOrId", "Contract Symbol or ID", {
                    required: true,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("contract", "Option Contract")],
        },
        "optionsAction==chain": {
            fields: [
                node_sdk_1.FieldBuilder.String("chainUnderlying", "Underlying Symbol", {
                    required: true,
                    placeholder: "AAPL",
                }),
                node_sdk_1.FieldBuilder.MultiOption("chainType", "Type", {
                    options: [
                        { value: "all", displayName: "Calls & Puts" },
                        { value: "call", displayName: "Calls" },
                        { value: "put", displayName: "Puts" },
                    ],
                    initialValue: "all",
                }),
                node_sdk_1.FieldBuilder.String("chainExpiration", "Expiration Date", {
                    placeholder: "2026-12-18",
                }),
                node_sdk_1.FieldBuilder.Float("chainStrikeFrom", "Minimum Strike", {
                    min: 0,
                    advanced: true,
                }),
                node_sdk_1.FieldBuilder.Float("chainStrikeTo", "Maximum Strike", {
                    min: 0,
                    advanced: true,
                }),
                node_sdk_1.FieldBuilder.Integer("chainLimit", "Max Contracts", {
                    initialValue: 50,
                    min: 1,
                    max: 500,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("chain", "Option Chain")],
        },
    },
    "resource==screener": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("screenerView", "View", {
                options: [
                    { value: "mostActive", displayName: "Most Active" },
                    { value: "movers", displayName: "Movers" },
                ],
                initialValue: "mostActive",
                variant: "tab",
            }),
        ],
        "screenerView==mostActive": {
            fields: [
                node_sdk_1.FieldBuilder.MultiOption("activeBy", "Rank By", {
                    options: [
                        { value: "volume", displayName: "Volume" },
                        { value: "trades", displayName: "Trades" },
                    ],
                    initialValue: "volume",
                }),
                node_sdk_1.FieldBuilder.Integer("activeLimit", "Max Results", {
                    initialValue: 10,
                    min: 1,
                    max: 100,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("active", "Most Active")],
        },
        "screenerView==movers": {
            fields: [
                node_sdk_1.FieldBuilder.MultiOption("moversMarket", "Market", {
                    options: [
                        { value: "stocks", displayName: "Stocks" },
                        { value: "crypto", displayName: "Crypto" },
                    ],
                    initialValue: "stocks",
                }),
                node_sdk_1.FieldBuilder.Integer("moversLimit", "Max Per Side", {
                    initialValue: 10,
                    min: 1,
                    max: 100,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("movers", "Movers")],
        },
    },
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: [],
        inputs: [],
        outputs: [node_sdk_1.OutputBuilder.ToolList("tools", "Alpaca Market Tools")],
    }),
});
