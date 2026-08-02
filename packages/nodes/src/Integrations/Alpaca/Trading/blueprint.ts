import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk"

import { Alpaca } from "@pretzel-graph/nodes/Credentials/Alpaca"


const confirmLive = <T_Id extends string>(id: T_Id) => FieldBuilder.Boolean(id, "Confirm Live Mutation", {
    initialValue: false,
    tooltip:      "Required when the attached credential targets live trading. Paper trading ignores it.",
})

const timeInForce = <T_Id extends string>(id: T_Id) => FieldBuilder.MultiOption(id, "Time in Force", {
    options: [
        { value: "day", displayName: "Day"                 },
        { value: "gtc", displayName: "Good Until Canceled" },
        { value: "opg", displayName: "Market Open"         },
        { value: "cls", displayName: "Market Close"        },
        { value: "ioc", displayName: "Immediate or Cancel" },
        { value: "fok", displayName: "Fill or Kill"        },
    ],
    initialValue: "day",
})


export const Blueprint = defineBlueprint({
    id:              "Integrations.Alpaca.Trading",
    credentials:     [Alpaca],
    displayName:     "Alpaca Trading",
    description:     "Places, replaces and cancels Alpaca orders and closes positions.",
    icon:            "Alpaca",
    accent:          "port-Data",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        FieldBuilder.MultiOption("action", "Action", {
            options: [
                { value: "submit",        displayName: "Submit Order"       },
                { value: "replace",       displayName: "Replace Order"      },
                { value: "cancel",        displayName: "Cancel Order"       },
                { value: "cancelAll",     displayName: "Cancel All Orders"  },
                { value: "closePosition", displayName: "Close Position"     },
                { value: "closeAll",      displayName: "Close All Positions" },
                { value: "exerciseOption", displayName: "Exercise Option"   },
            ],
            initialValue: "submit",
        }),
    ],
    inputs:  [],
    outputs: [],


    "action==submit": {
        fields: [
            FieldBuilder.String("submitSymbol", "Symbol", {
                required:    true,
                placeholder: "AAPL",
            }),
            FieldBuilder.MultiOption("submitSide", "Side", {
                options: [
                    { value: "buy",  displayName: "Buy"  },
                    { value: "sell", displayName: "Sell" },
                ],
                initialValue: "buy",
                variant:      "tab",
            }),
            FieldBuilder.MultiOption("orderType", "Order Type", {
                options: [
                    { value: "market",        displayName: "Market"        },
                    { value: "limit",         displayName: "Limit"         },
                    { value: "stop",          displayName: "Stop"          },
                    { value: "stop_limit",    displayName: "Stop Limit"    },
                    { value: "trailing_stop", displayName: "Trailing Stop" },
                ],
                initialValue: "market",
            }),
            timeInForce("submitTimeInForce"),
            FieldBuilder.Boolean("extendedHours", "Extended Hours", {
                initialValue: false,
                tooltip:      "Supported only for eligible limit orders and time-in-force combinations.",
                advanced:     true,
            }),
            FieldBuilder.String("clientOrderId", "Client Order ID", {
                tooltip:  "Optional stable id used to reconcile an ambiguous transport failure.",
                advanced: true,
            }),
            confirmLive("submitConfirmLive"),
        ],

        "orderType==market": {
            fields: [
                FieldBuilder.Float("marketQuantity", "Quantity", {
                    min:     0,
                    tooltip: "Provide Quantity or Notional, not both.",
                }),
                FieldBuilder.Float("marketNotional", "Notional", {
                    min:      0,
                    tooltip:  "Dollar amount. Provide Quantity or Notional, not both.",
                }),
            ],
            outputs: [OutputBuilder.Data("order", "Order")],
        },

        "orderType==limit": {
            fields: [
                FieldBuilder.Float("limitQuantity", "Quantity", { required: true, min: 0 }),
                FieldBuilder.Float("limitPrice", "Limit Price", { required: true, min: 0 }),
            ],
            outputs: [OutputBuilder.Data("order", "Order")],
        },

        "orderType==stop": {
            fields: [
                FieldBuilder.Float("stopQuantity", "Quantity", { required: true, min: 0 }),
                FieldBuilder.Float("stopPrice", "Stop Price", { required: true, min: 0 }),
            ],
            outputs: [OutputBuilder.Data("order", "Order")],
        },

        "orderType==stop_limit": {
            fields: [
                FieldBuilder.Float("stopLimitQuantity", "Quantity", { required: true, min: 0 }),
                FieldBuilder.Float("stopLimitStopPrice", "Stop Price", { required: true, min: 0 }),
                FieldBuilder.Float("stopLimitLimitPrice", "Limit Price", { required: true, min: 0 }),
            ],
            outputs: [OutputBuilder.Data("order", "Order")],
        },

        "orderType==trailing_stop": {
            fields: [
                FieldBuilder.Float("trailingQuantity", "Quantity", { required: true, min: 0 }),
                FieldBuilder.MultiOption("trailingMode", "Trail By", {
                    options: [
                        { value: "price",   displayName: "Price"   },
                        { value: "percent", displayName: "Percent" },
                    ],
                    initialValue: "percent",
                    variant:      "tab",
                }),
            ],

            "trailingMode==price": {
                fields: [
                    FieldBuilder.Float("trailingPrice", "Trail Price", { required: true, min: 0 }),
                ],
                outputs: [OutputBuilder.Data("order", "Order")],
            },

            "trailingMode==percent": {
                fields: [
                    FieldBuilder.Float("trailingPercent", "Trail Percent", { required: true, min: 0 }),
                ],
                outputs: [OutputBuilder.Data("order", "Order")],
            },
        },
    },


    "action==replace": {
        fields: [
            FieldBuilder.String("replaceOrderId", "Order ID", { required: true }),
            FieldBuilder.Float("replaceQuantity", "New Quantity", { min: 0 }),
            FieldBuilder.Float("replaceLimitPrice", "New Limit Price", { min: 0 }),
            FieldBuilder.Float("replaceStopPrice", "New Stop Price", { min: 0 }),
            FieldBuilder.Float("replaceTrail", "New Trail", { min: 0 }),
            timeInForce("replaceTimeInForce"),
            FieldBuilder.String("replaceClientOrderId", "New Client Order ID", {
                advanced: true,
            }),
            confirmLive("replaceConfirmLive"),
        ],
        outputs: [OutputBuilder.Data("order", "Replacement Order")],
    },


    "action==cancel": {
        fields: [
            FieldBuilder.String("cancelOrderId", "Order ID", { required: true }),
            confirmLive("cancelConfirmLive"),
        ],
        outputs: [OutputBuilder.Data("result", "Cancellation")],
    },


    "action==cancelAll": {
        fields: [confirmLive("cancelAllConfirmLive")],
        outputs: [OutputBuilder.Data("result", "Cancellation")],
    },


    "action==closePosition": {
        fields: [
            FieldBuilder.String("closeSymbolOrId", "Symbol or Asset ID", { required: true }),
            FieldBuilder.MultiOption("closeAmountType", "Close", {
                options: [
                    { value: "all",        displayName: "Entire Position" },
                    { value: "quantity",   displayName: "Quantity"        },
                    { value: "percentage", displayName: "Percentage"      },
                ],
                initialValue: "all",
            }),
            confirmLive("closeConfirmLive"),
        ],

        "closeAmountType==all": {
            outputs: [OutputBuilder.Data("order", "Closing Order")],
        },

        "closeAmountType==quantity": {
            fields: [
                FieldBuilder.Float("closeQuantity", "Quantity", { required: true, min: 0 }),
            ],
            outputs: [OutputBuilder.Data("order", "Closing Order")],
        },

        "closeAmountType==percentage": {
            fields: [
                FieldBuilder.Float("closePercentage", "Percentage", {
                    required: true,
                    min:      0,
                    max:      100,
                }),
            ],
            outputs: [OutputBuilder.Data("order", "Closing Order")],
        },
    },


    "action==closeAll": {
        fields: [
            FieldBuilder.Boolean("closeAllCancelOrders", "Cancel Open Orders First", {
                initialValue: false,
            }),
            confirmLive("closeAllConfirmLive"),
        ],
        outputs: [OutputBuilder.Data("result", "Close Result")],
    },


    "action==exerciseOption": {
        fields: [
            FieldBuilder.String("exerciseSymbolOrId", "Option Symbol or Contract ID", {
                required: true,
            }),
            confirmLive("exerciseConfirmLive"),
        ],
        outputs: [OutputBuilder.Data("result", "Exercise Result")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Alpaca Trading Tools")],
    }),
})
