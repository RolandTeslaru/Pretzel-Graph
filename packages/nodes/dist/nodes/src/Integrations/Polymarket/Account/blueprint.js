"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const Polymarket_1 = require("../../../Credentials/Polymarket");
const assetTypeOptions = [
    { value: "COLLATERAL", displayName: "USDC", description: "Your cash balance." },
    { value: "CONDITIONAL", displayName: "Outcome", description: "Your holding of one outcome token." },
];
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Polymarket.Account",
    credentials: [Polymarket_1.PolymarketApiKey],
    displayName: "Polymarket Account",
    description: "Reads your own Polymarket account — resting orders, fills, balances and rewards.",
    icon: "Polymarket",
    accent: "port-DataList",
    proxyCompatible: true,
    toolCompatible: true,
    // Read-only, and structurally so: this node authenticates with an API key alone, which can sign
    // requests but not orders. Placing and cancelling live on the Trading node, behind a wallet key.
    // The account is whichever one issued the key — there is nothing to address here.
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("resource", "Resource", {
            options: [
                { value: "openOrders", displayName: "Open Orders", description: "Orders currently resting on the book." },
                { value: "order", displayName: "Order", description: "One order, by id." },
                { value: "trades", displayName: "Trades", description: "Your fills, as recorded by the exchange." },
                { value: "balance", displayName: "Balance", description: "Cash or outcome-token balance, and allowance." },
                { value: "rewards", displayName: "Rewards", description: "Liquidity-provision earnings." },
                { value: "scoring", displayName: "Order Scoring", description: "Whether orders currently qualify for rewards." },
                { value: "settings", displayName: "Settings", description: "Account-level trading restrictions." },
            ],
            initialValue: "openOrders",
        }),
    ],
    inputs: [],
    outputs: [],
    "resource==openOrders": {
        fields: [
            node_sdk_1.FieldBuilder.String("openOrdersConditionId", "Market", {
                placeholder: "0x…",
                tooltip: "Condition ID. Leave empty for every market.",
            }),
            node_sdk_1.FieldBuilder.String("openOrdersTokenId", "Outcome Token", {
                tooltip: "Token ID. Narrows to one side of a market.",
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.DataList("orders", "Open Orders")],
    },
    "resource==order": {
        fields: [
            node_sdk_1.FieldBuilder.String("orderId", "Order ID", { required: true }),
        ],
        outputs: [node_sdk_1.OutputBuilder.Data("order", "Order")],
    },
    "resource==trades": {
        fields: [
            node_sdk_1.FieldBuilder.String("tradesConditionId", "Market", {
                placeholder: "0x…",
                tooltip: "Condition ID. Leave empty for every market.",
            }),
            node_sdk_1.FieldBuilder.String("tradesTokenId", "Outcome Token", {
                tooltip: "Token ID. Narrows to one side of a market.",
            }),
            node_sdk_1.FieldBuilder.Boolean("tradesOnlyFirstPage", "First Page Only", {
                initialValue: true,
                tooltip: "Off walks every page, which on an active account is a lot of requests.",
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.DataList("trades", "Trades")],
    },
    "resource==balance": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("balanceAssetType", "Asset", {
                options: assetTypeOptions,
                initialValue: "COLLATERAL",
                variant: "tab",
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.Data("balance", "Balance")],
        "balanceAssetType==CONDITIONAL": {
            fields: [
                node_sdk_1.FieldBuilder.String("balanceTokenId", "Token ID", { required: true }),
            ],
        },
    },
    "resource==rewards": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("rewardsView", "View", {
                options: [
                    { value: "earnings", displayName: "Earnings", description: "What each market paid you on a given day." },
                    { value: "totals", displayName: "Totals", description: "Your total earnings for a given day." },
                    { value: "markets", displayName: "Markets", description: "Reward config of the markets you earned in." },
                    { value: "percentages", displayName: "Percentages", description: "Your current share of each reward pool." },
                ],
                initialValue: "earnings",
            }),
        ],
        "rewardsView==earnings": {
            fields: [
                node_sdk_1.FieldBuilder.String("earningsDate", "Date", { required: true, placeholder: "2026-07-27" }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("earnings", "Earnings")],
        },
        "rewardsView==totals": {
            fields: [
                node_sdk_1.FieldBuilder.String("totalsDate", "Date", { required: true, placeholder: "2026-07-27" }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("totals", "Totals")],
        },
        "rewardsView==markets": {
            fields: [
                node_sdk_1.FieldBuilder.String("rewardMarketsDate", "Date", { required: true, placeholder: "2026-07-27" }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("markets", "Markets")],
        },
        "rewardsView==percentages": {
            outputs: [node_sdk_1.OutputBuilder.Data("percentages", "Percentages")],
        },
    },
    "resource==scoring": {
        fields: [
            node_sdk_1.FieldBuilder.List("scoringOrderIds", "Order IDs", {
                required: true,
                tooltip: "Orders to check. Only resting orders can score.",
            }),
        ],
        outputs: [node_sdk_1.OutputBuilder.Data("scoring", "Scoring")],
    },
    "resource==settings": {
        outputs: [node_sdk_1.OutputBuilder.Data("settings", "Settings")],
    },
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: [],
        inputs: [],
        outputs: [node_sdk_1.OutputBuilder.ToolList("tools", "Polymarket Account Tools")],
    }),
});
