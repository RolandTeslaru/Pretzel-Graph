import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
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
        FieldBuilder.MultiOption("resource", "Resource", {
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
        FieldBuilder.String("address", "Wallet Address", {
            required:    true,
            placeholder: "0x...",
            tooltip:     "Actual master or sub-account address. Read-only; an agent-wallet address usually returns empty account state.",
        }),
        FieldBuilder.String("dex", "Perpetual DEX", {
            placeholder: "xyz",
            tooltip:     "Optional HIP-3 DEX name. Empty selects Hyperliquid's original perpetual DEX.",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==state": {
        outputs: [OutputBuilder.Data("state", "Perpetual State")],
    },

    "resource==positions": {
        outputs: [OutputBuilder.DataList("positions", "Positions")],
    },

    "resource==spotBalances": {
        outputs: [OutputBuilder.DataList("spotBalances", "Spot Balances")],
    },

    "resource==openOrders": {
        outputs: [OutputBuilder.DataList("openOrders", "Open Orders")],
    },

    "resource==fills": {
        fields: [
            FieldBuilder.Integer("fillsLookbackHours", "Lookback (hours)", {
                initialValue: 168,
                min:          1,
                max:          24 * 365,
            }),
            FieldBuilder.Integer("fillsLimit", "Max Results", {
                initialValue: 100,
                min:          1,
                max:          2_000,
            }),
            FieldBuilder.Boolean("fillsAggregateByTime", "Aggregate Partial Fills", {
                initialValue: true,
            }),
        ],
        outputs: [OutputBuilder.DataList("fills", "Fills")],
    },

    "resource==funding": {
        fields: [
            FieldBuilder.Integer("fundingLookbackHours", "Lookback (hours)", {
                initialValue: 168,
                min:          1,
                max:          24 * 365,
            }),
            FieldBuilder.Integer("fundingLimit", "Max Results", {
                initialValue: 100,
                min:          1,
                max:          500,
            }),
        ],
        outputs: [OutputBuilder.DataList("funding", "Funding")],
    },


    "isConvertedToTool==true": defineTool({
        fields: [
            FieldBuilder.String("address", "Default Wallet Address", {
                placeholder: "0x...",
                tooltip:     "Optional default actual account address. Every tool call may override it.",
            }),
            FieldBuilder.String("dex", "Default Perpetual DEX", {
                placeholder: "xyz",
                tooltip:     "Optional HIP-3 DEX used when a tool call does not specify one.",
            }),
        ],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Hyperliquid Account Tools")],
    }),
});
