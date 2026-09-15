import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk"

import { Alpaca } from "@pretzel-graph/nodes/Credentials/Alpaca"


const confirmLive = <T_Id extends string>(id: T_Id) => defineField.Boolean(id, "Confirm Live Mutation", {
    initialValue: false,
    tooltip:      "Required when the attached credential targets live trading. Paper trading ignores it.",
})

const timeInForce = <T_Id extends string>(id: T_Id) => defineField.MultiOption(id, "Time in Force", {
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
        defineField.MultiOption("action", "Action", {
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
            defineField.String("submitSymbol", "Symbol", {
                required:    true,
                placeholder: "AAPL",
            }),
            defineField.MultiOption("submitSide", "Side", {
                options: [
                    { value: "buy",  displayName: "Buy"  },
                    { value: "sell", displayName: "Sell" },
                ],
                initialValue: "buy",
                variant:      "tab",
            }),
            defineField.MultiOption("orderType", "Order Type", {
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
            defineField.Boolean("extendedHours", "Extended Hours", {
                initialValue: false,
                tooltip:      "Supported only for eligible limit orders and time-in-force combinations.",
                advanced:     true,
            }),
            defineField.String("clientOrderId", "Client Order ID", {
                tooltip:  "Optional stable id used to reconcile an ambiguous transport failure.",
                advanced: true,
            }),
            confirmLive("submitConfirmLive"),
        ],

        "orderType==market": {
            fields: [
                defineField.Float("marketQuantity", "Quantity", {
                    min:     0,
                    tooltip: "Provide Quantity or Notional, not both.",
                }),
                defineField.Float("marketNotional", "Notional", {
                    min:      0,
                    tooltip:  "Dollar amount. Provide Quantity or Notional, not both.",
                }),
            ],
            outputs: [defineOutput.Data("order", "Order")],
        },

        "orderType==limit": {
            fields: [
                defineField.Float("limitQuantity", "Quantity", { required: true, min: 0 }),
                defineField.Float("limitPrice", "Limit Price", { required: true, min: 0 }),
            ],
            outputs: [defineOutput.Data("order", "Order")],
        },

        "orderType==stop": {
            fields: [
                defineField.Float("stopQuantity", "Quantity", { required: true, min: 0 }),
                defineField.Float("stopPrice", "Stop Price", { required: true, min: 0 }),
            ],
            outputs: [defineOutput.Data("order", "Order")],
        },

        "orderType==stop_limit": {
            fields: [
                defineField.Float("stopLimitQuantity", "Quantity", { required: true, min: 0 }),
                defineField.Float("stopLimitStopPrice", "Stop Price", { required: true, min: 0 }),
                defineField.Float("stopLimitLimitPrice", "Limit Price", { required: true, min: 0 }),
            ],
            outputs: [defineOutput.Data("order", "Order")],
        },

        "orderType==trailing_stop": {
            fields: [
                defineField.Float("trailingQuantity", "Quantity", { required: true, min: 0 }),
                defineField.MultiOption("trailingMode", "Trail By", {
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
                    defineField.Float("trailingPrice", "Trail Price", { required: true, min: 0 }),
                ],
                outputs: [defineOutput.Data("order", "Order")],
            },

            "trailingMode==percent": {
                fields: [
                    defineField.Float("trailingPercent", "Trail Percent", { required: true, min: 0 }),
                ],
                outputs: [defineOutput.Data("order", "Order")],
            },
        },
    },


    "action==replace": {
        fields: [
            defineField.String("replaceOrderId", "Order ID", { required: true }),
            defineField.Float("replaceQuantity", "New Quantity", { min: 0 }),
            defineField.Float("replaceLimitPrice", "New Limit Price", { min: 0 }),
            defineField.Float("replaceStopPrice", "New Stop Price", { min: 0 }),
            defineField.Float("replaceTrail", "New Trail", { min: 0 }),
            timeInForce("replaceTimeInForce"),
            defineField.String("replaceClientOrderId", "New Client Order ID", {
                advanced: true,
            }),
            confirmLive("replaceConfirmLive"),
        ],
        outputs: [defineOutput.Data("order", "Replacement Order")],
    },


    "action==cancel": {
        fields: [
            defineField.String("cancelOrderId", "Order ID", { required: true }),
            confirmLive("cancelConfirmLive"),
        ],
        outputs: [defineOutput.Data("result", "Cancellation")],
    },


    "action==cancelAll": {
        fields: [confirmLive("cancelAllConfirmLive")],
        outputs: [defineOutput.Data("result", "Cancellation")],
    },


    "action==closePosition": {
        fields: [
            defineField.String("closeSymbolOrId", "Symbol or Asset ID", { required: true }),
            defineField.MultiOption("closeAmountType", "Close", {
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
            outputs: [defineOutput.Data("order", "Closing Order")],
        },

        "closeAmountType==quantity": {
            fields: [
                defineField.Float("closeQuantity", "Quantity", { required: true, min: 0 }),
            ],
            outputs: [defineOutput.Data("order", "Closing Order")],
        },

        "closeAmountType==percentage": {
            fields: [
                defineField.Float("closePercentage", "Percentage", {
                    required: true,
                    min:      0,
                    max:      100,
                }),
            ],
            outputs: [defineOutput.Data("order", "Closing Order")],
        },
    },


    "action==closeAll": {
        fields: [
            defineField.Boolean("closeAllCancelOrders", "Cancel Open Orders First", {
                initialValue: false,
            }),
            confirmLive("closeAllConfirmLive"),
        ],
        outputs: [defineOutput.Data("result", "Close Result")],
    },


    "action==exerciseOption": {
        fields: [
            defineField.String("exerciseSymbolOrId", "Option Symbol or Contract ID", {
                required: true,
            }),
            confirmLive("exerciseConfirmLive"),
        ],
        outputs: [defineOutput.Data("result", "Exercise Result")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Alpaca Trading Tools")],
    }),
})
