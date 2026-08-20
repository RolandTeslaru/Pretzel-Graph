"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.HyperLiquid.Account",
    displayName: "HyperLiquid Account",
    description: "Reads normalized public account state, balances, positions, orders, fills and funding.",
    icon: "HyperLiquid",
    accent: "port-Data",
    iconColor: "color-cyan-500",
    toolCompatible: true,
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("resource", "Resource", {
            options: [
                { value: "state", displayName: "Perpetual State" },
                { value: "positions", displayName: "Positions" },
                { value: "spotBalances", displayName: "Spot Balances" },
                { value: "openOrders", displayName: "Open Orders" },
                { value: "fills", displayName: "Fills" },
                { value: "funding", displayName: "Funding" },
            ],
            initialValue: "state",
        }),
        node_sdk_1.FieldBuilder.String("address", "Wallet Address", {
            required: true,
            placeholder: "0x...",
            tooltip: "Actual master or sub-account address. Read-only; an agent-wallet address usually returns empty account state.",
        }),
        node_sdk_1.FieldBuilder.String("dex", "Perpetual DEX", {
            placeholder: "xyz",
            tooltip: "Optional HIP-3 DEX name. Empty selects Hyperliquid's original perpetual DEX.",
        }),
    ],
    inputs: [],
    outputs: [],
    "resource==state": {
        outputs: [node_sdk_1.OutputBuilder.Data("state", "Perpetual State")],
    },
    "resource==positions": {
        outputs: [node_sdk_1.OutputBuilder.DataList("positions", "Positions")],
    },
    "resource==spotBalances": {
        outputs: [node_sdk_1.OutputBuilder.DataList("spotBalances", "Spot Balances")],
    },
    "resource==openOrders": {
        outputs: [node_sdk_1.OutputBuilder.DataList("openOrders", "Open Orders")],
    },
    "resource==fills": {
        fields: [
            node_sdk_1.FieldBuilder.Integer("fillsLookbackHours", "Lookback (hours)", {
                initialValue: 168,
                min: 1,
                max: 24 * 365,
            }),
            node_sdk_1.FieldBuilder.Integer("fillsLimit", "Max Results", {
                initialValue: 100,
                min: 1,
                max: 2_000,
            }),
            node_sdk_1.FieldBuilder.Boolean("fillsAggregateByTime", "Aggregate Partial Fills", {
                initialValue: true,
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.DataList("fills", "Fills")],
    },
    "resource==funding": {
        fields: [
            node_sdk_1.FieldBuilder.Integer("fundingLookbackHours", "Lookback (hours)", {
                initialValue: 168,
                min: 1,
                max: 24 * 365,
            }),
            node_sdk_1.FieldBuilder.Integer("fundingLimit", "Max Results", {
                initialValue: 100,
                min: 1,
                max: 500,
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.DataList("funding", "Funding")],
    },
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: [
            node_sdk_1.FieldBuilder.String("address", "Default Wallet Address", {
                placeholder: "0x...",
                tooltip: "Optional default actual account address. Every tool call may override it.",
            }),
            node_sdk_1.FieldBuilder.String("dex", "Default Perpetual DEX", {
                placeholder: "xyz",
                tooltip: "Optional HIP-3 DEX used when a tool call does not specify one.",
            }),
        ],
        inputs: [],
        outputs: [node_sdk_1.OutputBuilder.ToolList("tools", "Hyperliquid Account Tools")],
    }),
});
