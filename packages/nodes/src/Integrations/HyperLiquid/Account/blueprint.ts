import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";


export const Blueprint = defineBlueprint({
    id:              "Integrations.HyperLiquid.Account",
    displayName:     "HyperLiquid Account",
    description:     "Reads normalized public account state, balances, positions, orders, fills and funding.",
    icon:            "HyperLiquid",
    accent:          "port-Data",
    iconColor:       "color-cyan-500",
    toolCompatible:  true,

    fields: [
        defineField.MultiOption("resource", "Resource", {
            options: [
                { value: "state",        displayName: "Perpetual State" },
                { value: "positions",    displayName: "Positions"       },
                { value: "spotBalances", displayName: "Spot Balances"   },
                { value: "openOrders",   displayName: "Open Orders"     },
                { value: "fills",        displayName: "Fills"           },
                { value: "funding",      displayName: "Funding"         },
            ],
            initialValue: "state",
        }),
        defineField.String("address", "Wallet Address", {
            required:    true,
            placeholder: "0x...",
            tooltip:     "Actual master or sub-account address. Read-only; an agent-wallet address usually returns empty account state.",
        }),
        defineField.String("dex", "Perpetual DEX", {
            placeholder: "xyz",
            tooltip:     "Optional HIP-3 DEX name. Empty selects Hyperliquid's original perpetual DEX.",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==state": {
        outputs: [defineOutput.Data("state", "Perpetual State")],
    },

    "resource==positions": {
        outputs: [defineOutput.DataList("positions", "Positions")],
    },

    "resource==spotBalances": {
        outputs: [defineOutput.DataList("spotBalances", "Spot Balances")],
    },

    "resource==openOrders": {
        outputs: [defineOutput.DataList("openOrders", "Open Orders")],
    },

    "resource==fills": {
        fields: [
            defineField.Integer("fillsLookbackHours", "Lookback (hours)", {
                initialValue: 168,
                min:          1,
                max:          24 * 365,
            }),
            defineField.Integer("fillsLimit", "Max Results", {
                initialValue: 100,
                min:          1,
                max:          2_000,
            }),
            defineField.Boolean("fillsAggregateByTime", "Aggregate Partial Fills", {
                initialValue: true,
            }),
        ],
        outputs: [defineOutput.DataList("fills", "Fills")],
    },

    "resource==funding": {
        fields: [
            defineField.Integer("fundingLookbackHours", "Lookback (hours)", {
                initialValue: 168,
                min:          1,
                max:          24 * 365,
            }),
            defineField.Integer("fundingLimit", "Max Results", {
                initialValue: 100,
                min:          1,
                max:          500,
            }),
        ],
        outputs: [defineOutput.DataList("funding", "Funding")],
    },


    "isConvertedToTool==true": defineTool({
        fields: [
            defineField.String("address", "Default Wallet Address", {
                placeholder: "0x...",
                tooltip:     "Optional default actual account address. Every tool call may override it.",
            }),
            defineField.String("dex", "Default Perpetual DEX", {
                placeholder: "xyz",
                tooltip:     "Optional HIP-3 DEX used when a tool call does not specify one.",
            }),
        ],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Hyperliquid Account Tools")],
    }),
});
