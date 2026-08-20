"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const Alpaca_1 = require("../../../Credentials/Alpaca");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Alpaca.Account",
    credentials: [Alpaca_1.Alpaca],
    displayName: "Alpaca Account",
    description: "Reads the Alpaca account attached by the credential: balances, positions, orders and history.",
    icon: "Alpaca",
    accent: "port-DataList",
    proxyCompatible: true,
    toolCompatible: true,
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("resource", "Resource", {
            options: [
                { value: "summary", displayName: "Account Summary" },
                { value: "configuration", displayName: "Configuration" },
                { value: "positions", displayName: "Positions" },
                { value: "orders", displayName: "Orders" },
                { value: "activities", displayName: "Activities" },
                { value: "portfolio", displayName: "Portfolio" },
                { value: "watchlists", displayName: "Watchlists" },
            ],
            initialValue: "summary",
        }),
    ],
    inputs: [],
    outputs: [],
    "resource==summary": {
        outputs: [node_sdk_1.OutputBuilder.Data("account", "Account")],
    },
    "resource==configuration": {
        outputs: [node_sdk_1.OutputBuilder.Data("configuration", "Configuration")],
    },
    "resource==positions": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("positionsAction", "Action", {
                options: [
                    { value: "list", displayName: "List" },
                    { value: "get", displayName: "Get" },
                ],
                initialValue: "list",
                variant: "tab",
            }),
        ],
        "positionsAction==list": {
            outputs: [node_sdk_1.OutputBuilder.DataList("positions", "Positions")],
        },
        "positionsAction==get": {
            fields: [
                node_sdk_1.FieldBuilder.String("positionSymbolOrId", "Symbol or Asset ID", {
                    required: true,
                    placeholder: "AAPL",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("position", "Position")],
        },
    },
    "resource==orders": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("ordersAction", "Action", {
                options: [
                    { value: "list", displayName: "List" },
                    { value: "get", displayName: "Get" },
                ],
                initialValue: "list",
                variant: "tab",
            }),
        ],
        "ordersAction==list": {
            fields: [
                node_sdk_1.FieldBuilder.MultiOption("ordersStatus", "Status", {
                    options: [
                        { value: "open", displayName: "Open" },
                        { value: "closed", displayName: "Closed" },
                        { value: "all", displayName: "All" },
                    ],
                    initialValue: "open",
                }),
                node_sdk_1.FieldBuilder.List("ordersSymbols", "Symbols", {
                    tooltip: "Optional symbol filter.",
                }),
                node_sdk_1.FieldBuilder.MultiOption("ordersSide", "Side", {
                    options: [
                        { value: "all", displayName: "Both" },
                        { value: "buy", displayName: "Buy" },
                        { value: "sell", displayName: "Sell" },
                    ],
                    initialValue: "all",
                }),
                node_sdk_1.FieldBuilder.MultiOption("ordersDirection", "Direction", {
                    options: [
                        { value: "desc", displayName: "Newest First" },
                        { value: "asc", displayName: "Oldest First" },
                    ],
                    initialValue: "desc",
                    advanced: true,
                }),
                node_sdk_1.FieldBuilder.String("ordersAfter", "After", {
                    placeholder: "2026-07-01T00:00:00Z",
                    advanced: true,
                }),
                node_sdk_1.FieldBuilder.String("ordersUntil", "Until", {
                    placeholder: "2026-08-01T00:00:00Z",
                    advanced: true,
                }),
                node_sdk_1.FieldBuilder.Integer("ordersLimit", "Max Orders", {
                    initialValue: 50,
                    min: 1,
                    max: 500,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("orders", "Orders")],
        },
        "ordersAction==get": {
            fields: [
                node_sdk_1.FieldBuilder.String("orderId", "Order ID", { required: true }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("order", "Order")],
        },
    },
    "resource==activities": {
        fields: [
            node_sdk_1.FieldBuilder.List("activityTypes", "Activity Types", {
                tooltip: "Optional Alpaca activity codes, e.g. FILL, DIV, FEE.",
            }),
            node_sdk_1.FieldBuilder.MultiOption("activityCategory", "Category", {
                options: [
                    { value: "all", displayName: "All" },
                    { value: "trade_activity", displayName: "Trades" },
                    { value: "non_trade_activity", displayName: "Non-trade" },
                ],
                initialValue: "all",
            }),
            node_sdk_1.FieldBuilder.MultiOption("activityDirection", "Direction", {
                options: [
                    { value: "desc", displayName: "Newest First" },
                    { value: "asc", displayName: "Oldest First" },
                ],
                initialValue: "desc",
            }),
            node_sdk_1.FieldBuilder.String("activityAfter", "After", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.String("activityUntil", "Until", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.Integer("activityLimit", "Max Activities", {
                initialValue: 50,
                min: 1,
                max: 500,
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.DataList("activities", "Activities")],
    },
    "resource==portfolio": {
        fields: [
            node_sdk_1.FieldBuilder.String("portfolioPeriod", "Period", {
                initialValue: "1M",
                tooltip: "Examples: 1D, 1M, 3M, 1A or all.",
            }),
            node_sdk_1.FieldBuilder.String("portfolioTimeframe", "Timeframe", {
                initialValue: "1D",
                tooltip: "Examples: 1Min, 5Min, 1H or 1D.",
            }),
            node_sdk_1.FieldBuilder.String("portfolioStart", "Start", {
                placeholder: "2026-07-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.String("portfolioEnd", "End", {
                placeholder: "2026-08-01T00:00:00Z",
            }),
            node_sdk_1.FieldBuilder.Boolean("portfolioExtendedHours", "Extended Hours", {
                initialValue: false,
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.Data("portfolio", "Portfolio History")],
    },
    "resource==watchlists": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("watchlistsAction", "Action", {
                options: [
                    { value: "list", displayName: "List" },
                    { value: "get", displayName: "Get" },
                ],
                initialValue: "list",
                variant: "tab",
            }),
        ],
        "watchlistsAction==list": {
            outputs: [node_sdk_1.OutputBuilder.DataList("watchlists", "Watchlists")],
        },
        "watchlistsAction==get": {
            fields: [
                node_sdk_1.FieldBuilder.String("watchlistId", "Watchlist ID", {
                    tooltip: "Provide an ID, or leave empty and use Name.",
                }),
                node_sdk_1.FieldBuilder.String("watchlistName", "Watchlist Name"),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("watchlist", "Watchlist")],
        },
    },
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: [],
        inputs: [],
        outputs: [node_sdk_1.OutputBuilder.ToolList("tools", "Alpaca Account Tools")],
    }),
});
