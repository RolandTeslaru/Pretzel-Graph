import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";


const intervalOptions = [
    { value: "1m",  displayName: "1 minute"  },
    { value: "3m",  displayName: "3 minutes" },
    { value: "5m",  displayName: "5 minutes" },
    { value: "15m", displayName: "15 minutes" },
    { value: "30m", displayName: "30 minutes" },
    { value: "1h",  displayName: "1 hour"    },
    { value: "2h",  displayName: "2 hours"   },
    { value: "4h",  displayName: "4 hours"   },
    { value: "8h",  displayName: "8 hours"   },
    { value: "12h", displayName: "12 hours"  },
    { value: "1d",  displayName: "1 day"     },
    { value: "3d",  displayName: "3 days"    },
    { value: "1w",  displayName: "1 week"    },
    { value: "1M",  displayName: "1 month"   },
] as const;


export const Blueprint = defineBlueprint({
    id:              "Integrations.HyperLiquid.Market",
    displayName:     "HyperLiquid Market",
    description:     "Reads normalized Hyperliquid perpetual and Spot markets, prices, candles and order books.",
    icon:            "HyperLiquid",
    accent:          "port-DataList",
    iconColor:       "color-cyan-500",
    toolCompatible:  true,

    fields: [
        defineField.MultiOption("resource", "Resource", {
            options: [
                { value: "markets",   displayName: "Markets"    },
                { value: "mids",      displayName: "Mid Prices" },
                { value: "candles",   displayName: "Candles"    },
                { value: "orderBook", displayName: "Order Book" },
            ],
            initialValue: "markets",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==markets": {
        fields: [
            defineField.MultiOption("marketKind", "Market Type", {
                options: [
                    { value: "perpetual", displayName: "Perpetuals" },
                    { value: "spot",      displayName: "Spot"       },
                ],
                initialValue: "perpetual",
                variant:      "tab",
            }),
            defineField.String("marketsDex", "Perpetual DEX", {
                placeholder: "xyz",
                tooltip:     "Optional HIP-3 DEX name. Empty selects Hyperliquid's original perpetual DEX. Ignored for Spot.",
            }),
            defineField.Integer("marketsLimit", "Max Results", {
                initialValue: 50,
                min:          1,
                max:          500,
            }),
        ],
        outputs: [defineOutput.DataList("markets", "Markets")],
    },


    "resource==mids": {
        fields: [
            defineField.String("midsDex", "Perpetual DEX", {
                placeholder: "xyz",
                tooltip:     "Optional HIP-3 DEX name. Empty selects the original DEX and includes Spot mids.",
            }),
            defineField.String("midsCoin", "Coin", {
                placeholder: "BTC",
                tooltip:     "Optional exact symbol or pair. Leave empty to browse prices.",
            }),
            defineField.Integer("midsLimit", "Max Results", {
                initialValue: 100,
                min:          1,
                max:          1_000,
            }),
        ],
        outputs: [defineOutput.DataList("mids", "Mid Prices")],
    },


    "resource==candles": {
        fields: [
            defineField.String("candlesCoin", "Coin", {
                required:    true,
                placeholder: "BTC",
                tooltip:     "Perpetual symbol (BTC), Spot pair (PURR/USDC or @107), or HIP-3 name (dex:coin).",
            }),
            defineField.MultiOption("candlesInterval", "Interval", {
                options:      intervalOptions,
                initialValue: "1h",
            }),
            defineField.Integer("candlesLookbackHours", "Lookback (hours)", {
                initialValue: 24,
                min:          1,
                max:          24 * 365,
                tooltip:      "Requested window ending now. Hyperliquid may return only its bounded recent candle history.",
            }),
        ],
        outputs: [defineOutput.DataList("candles", "Candles")],
    },


    "resource==orderBook": {
        fields: [
            defineField.String("orderBookCoin", "Coin", {
                required:    true,
                placeholder: "BTC",
                tooltip:     "Perpetual symbol (BTC), Spot pair (PURR/USDC or @107), or HIP-3 name (dex:coin).",
            }),
            defineField.Integer("orderBookDepth", "Depth", {
                initialValue: 15,
                min:          1,
                max:          20,
                tooltip:      "Price levels per side, best first. Hyperliquid returns at most 20.",
            }),
        ],
        outputs: [defineOutput.Data("orderBook", "Order Book")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Hyperliquid Market Tools")],
    }),
});
