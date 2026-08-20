"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const Alpaca_1 = require("../../../Credentials/Alpaca");
const confirmLive = (id) => node_sdk_1.FieldBuilder.Boolean(id, "Confirm Live Mutation", {
    initialValue: false,
    tooltip: "Required when the attached credential targets live trading. Paper trading ignores it.",
});
const timeInForce = (id) => node_sdk_1.FieldBuilder.MultiOption(id, "Time in Force", {
    options: [
        { value: "day", displayName: "Day" },
        { value: "gtc", displayName: "Good Until Canceled" },
        { value: "opg", displayName: "Market Open" },
        { value: "cls", displayName: "Market Close" },
        { value: "ioc", displayName: "Immediate or Cancel" },
        { value: "fok", displayName: "Fill or Kill" },
    ],
    initialValue: "day",
});
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Alpaca.Trading",
    credentials: [Alpaca_1.Alpaca],
    displayName: "Alpaca Trading",
    description: "Places, replaces and cancels Alpaca orders and closes positions.",
    icon: "Alpaca",
    accent: "port-Data",
    proxyCompatible: true,
    toolCompatible: true,
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("action", "Action", {
            options: [
                { value: "submit", displayName: "Submit Order" },
                { value: "replace", displayName: "Replace Order" },
                { value: "cancel", displayName: "Cancel Order" },
                { value: "cancelAll", displayName: "Cancel All Orders" },
                { value: "closePosition", displayName: "Close Position" },
                { value: "closeAll", displayName: "Close All Positions" },
                { value: "exerciseOption", displayName: "Exercise Option" },
            ],
            initialValue: "submit",
        }),
    ],
    inputs: [],
    outputs: [],
    "action==submit": {
        fields: [
            node_sdk_1.FieldBuilder.String("submitSymbol", "Symbol", {
                required: true,
                placeholder: "AAPL",
            }),
            node_sdk_1.FieldBuilder.MultiOption("submitSide", "Side", {
                options: [
                    { value: "buy", displayName: "Buy" },
                    { value: "sell", displayName: "Sell" },
                ],
                initialValue: "buy",
                variant: "tab",
            }),
            node_sdk_1.FieldBuilder.MultiOption("orderType", "Order Type", {
                options: [
                    { value: "market", displayName: "Market" },
                    { value: "limit", displayName: "Limit" },
                    { value: "stop", displayName: "Stop" },
                    { value: "stop_limit", displayName: "Stop Limit" },
                    { value: "trailing_stop", displayName: "Trailing Stop" },
                ],
                initialValue: "market",
            }),
            timeInForce("submitTimeInForce"),
            node_sdk_1.FieldBuilder.Boolean("extendedHours", "Extended Hours", {
                initialValue: false,
                tooltip: "Supported only for eligible limit orders and time-in-force combinations.",
                advanced: true,
            }),
            node_sdk_1.FieldBuilder.String("clientOrderId", "Client Order ID", {
                tooltip: "Optional stable id used to reconcile an ambiguous transport failure.",
                advanced: true,
            }),
            confirmLive("submitConfirmLive"),
        ],
        "orderType==market": {
            fields: [
                node_sdk_1.FieldBuilder.Float("marketQuantity", "Quantity", {
                    min: 0,
                    tooltip: "Provide Quantity or Notional, not both.",
                }),
                node_sdk_1.FieldBuilder.Float("marketNotional", "Notional", {
                    min: 0,
                    tooltip: "Dollar amount. Provide Quantity or Notional, not both.",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("order", "Order")],
        },
        "orderType==limit": {
            fields: [
                node_sdk_1.FieldBuilder.Float("limitQuantity", "Quantity", { required: true, min: 0 }),
                node_sdk_1.FieldBuilder.Float("limitPrice", "Limit Price", { required: true, min: 0 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("order", "Order")],
        },
        "orderType==stop": {
            fields: [
                node_sdk_1.FieldBuilder.Float("stopQuantity", "Quantity", { required: true, min: 0 }),
                node_sdk_1.FieldBuilder.Float("stopPrice", "Stop Price", { required: true, min: 0 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("order", "Order")],
        },
        "orderType==stop_limit": {
            fields: [
                node_sdk_1.FieldBuilder.Float("stopLimitQuantity", "Quantity", { required: true, min: 0 }),
                node_sdk_1.FieldBuilder.Float("stopLimitStopPrice", "Stop Price", { required: true, min: 0 }),
                node_sdk_1.FieldBuilder.Float("stopLimitLimitPrice", "Limit Price", { required: true, min: 0 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("order", "Order")],
        },
        "orderType==trailing_stop": {
            fields: [
                node_sdk_1.FieldBuilder.Float("trailingQuantity", "Quantity", { required: true, min: 0 }),
                node_sdk_1.FieldBuilder.MultiOption("trailingMode", "Trail By", {
                    options: [
                        { value: "price", displayName: "Price" },
                        { value: "percent", displayName: "Percent" },
                    ],
                    initialValue: "percent",
                    variant: "tab",
                }),
            ],
            "trailingMode==price": {
                fields: [
                    node_sdk_1.FieldBuilder.Float("trailingPrice", "Trail Price", { required: true, min: 0 }),
                ],
                outputs: [node_sdk_1.OutputBuilder.Data("order", "Order")],
            },
            "trailingMode==percent": {
                fields: [
                    node_sdk_1.FieldBuilder.Float("trailingPercent", "Trail Percent", { required: true, min: 0 }),
                ],
                outputs: [node_sdk_1.OutputBuilder.Data("order", "Order")],
            },
        },
    },
    "action==replace": {
        fields: [
            node_sdk_1.FieldBuilder.String("replaceOrderId", "Order ID", { required: true }),
            node_sdk_1.FieldBuilder.Float("replaceQuantity", "New Quantity", { min: 0 }),
            node_sdk_1.FieldBuilder.Float("replaceLimitPrice", "New Limit Price", { min: 0 }),
            node_sdk_1.FieldBuilder.Float("replaceStopPrice", "New Stop Price", { min: 0 }),
            node_sdk_1.FieldBuilder.Float("replaceTrail", "New Trail", { min: 0 }),
            timeInForce("replaceTimeInForce"),
            node_sdk_1.FieldBuilder.String("replaceClientOrderId", "New Client Order ID", {
                advanced: true,
            }),
            confirmLive("replaceConfirmLive"),
        ],
        outputs: [node_sdk_1.OutputBuilder.Data("order", "Replacement Order")],
    },
    "action==cancel": {
        fields: [
            node_sdk_1.FieldBuilder.String("cancelOrderId", "Order ID", { required: true }),
            confirmLive("cancelConfirmLive"),
        ],
        outputs: [node_sdk_1.OutputBuilder.Data("result", "Cancellation")],
    },
    "action==cancelAll": {
        fields: [confirmLive("cancelAllConfirmLive")],
        outputs: [node_sdk_1.OutputBuilder.Data("result", "Cancellation")],
    },
    "action==closePosition": {
        fields: [
            node_sdk_1.FieldBuilder.String("closeSymbolOrId", "Symbol or Asset ID", { required: true }),
            node_sdk_1.FieldBuilder.MultiOption("closeAmountType", "Close", {
                options: [
                    { value: "all", displayName: "Entire Position" },
                    { value: "quantity", displayName: "Quantity" },
                    { value: "percentage", displayName: "Percentage" },
                ],
                initialValue: "all",
            }),
            confirmLive("closeConfirmLive"),
        ],
        "closeAmountType==all": {
            outputs: [node_sdk_1.OutputBuilder.Data("order", "Closing Order")],
        },
        "closeAmountType==quantity": {
            fields: [
                node_sdk_1.FieldBuilder.Float("closeQuantity", "Quantity", { required: true, min: 0 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("order", "Closing Order")],
        },
        "closeAmountType==percentage": {
            fields: [
                node_sdk_1.FieldBuilder.Float("closePercentage", "Percentage", {
                    required: true,
                    min: 0,
                    max: 100,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("order", "Closing Order")],
        },
    },
    "action==closeAll": {
        fields: [
            node_sdk_1.FieldBuilder.Boolean("closeAllCancelOrders", "Cancel Open Orders First", {
                initialValue: false,
            }),
            confirmLive("closeAllConfirmLive"),
        ],
        outputs: [node_sdk_1.OutputBuilder.Data("result", "Close Result")],
    },
    "action==exerciseOption": {
        fields: [
            node_sdk_1.FieldBuilder.String("exerciseSymbolOrId", "Option Symbol or Contract ID", {
                required: true,
            }),
            confirmLive("exerciseConfirmLive"),
        ],
        outputs: [node_sdk_1.OutputBuilder.Data("result", "Exercise Result")],
    },
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: [],
        inputs: [],
        outputs: [node_sdk_1.OutputBuilder.ToolList("tools", "Alpaca Trading Tools")],
    }),
});
