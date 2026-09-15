import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";
import { PolymarketApiKey } from "@pretzel-graph/nodes/Credentials/Polymarket";


const assetTypeOptions = [
    { value: "COLLATERAL",  displayName: "USDC",     description: "Your cash balance."                     },
    { value: "CONDITIONAL", displayName: "Outcome",  description: "Your holding of one outcome token."     },
] as const;


export const Blueprint = defineBlueprint({
    id:              "Integrations.Polymarket.Account",
    credentials:     [PolymarketApiKey],
    displayName:     "Polymarket Account",
    description:     "Reads your own Polymarket account — resting orders, fills, balances and rewards.",
    icon:            "Polymarket",
    accent:          "port-DataList",
    proxyCompatible: true,
    toolCompatible:  true,

    // Read-only, and structurally so: this node authenticates with an API key alone, which can sign
    // requests but not orders. Placing and cancelling live on the Trading node, behind a wallet key.
    // The account is whichever one issued the key — there is nothing to address here.
    fields: [
        defineField.MultiOption("resource", "Resource", {
            options: [
                { value: "openOrders", displayName: "Open Orders",  description: "Orders currently resting on the book."          },
                { value: "order",      displayName: "Order",        description: "One order, by id."                              },
                { value: "trades",     displayName: "Trades",       description: "Your fills, as recorded by the exchange."       },
                { value: "balance",    displayName: "Balance",      description: "Cash or outcome-token balance, and allowance."  },
                { value: "rewards",    displayName: "Rewards",      description: "Liquidity-provision earnings."                  },
                { value: "scoring",    displayName: "Order Scoring", description: "Whether orders currently qualify for rewards." },
                { value: "settings",   displayName: "Settings",     description: "Account-level trading restrictions."            },
            ],
            initialValue: "openOrders",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==openOrders": {
        fields: [
            defineField.String("openOrdersConditionId", "Market", {
                placeholder: "0x…",
                tooltip:     "Condition ID. Leave empty for every market.",
            }),
            defineField.String("openOrdersTokenId", "Outcome Token", {
                tooltip: "Token ID. Narrows to one side of a market.",
            }),
        ],
        outputs: [defineOutput.DataList("orders", "Open Orders")],
    },

    "resource==order": {
        fields: [
            defineField.String("orderId", "Order ID", { required: true }),
        ],
        outputs: [defineOutput.Data("order", "Order")],
    },

    "resource==trades": {
        fields: [
            defineField.String("tradesConditionId", "Market", {
                placeholder: "0x…",
                tooltip:     "Condition ID. Leave empty for every market.",
            }),
            defineField.String("tradesTokenId", "Outcome Token", {
                tooltip: "Token ID. Narrows to one side of a market.",
            }),
            defineField.Boolean("tradesOnlyFirstPage", "First Page Only", {
                initialValue: true,
                tooltip:      "Off walks every page, which on an active account is a lot of requests.",
            }),
        ],
        outputs: [defineOutput.DataList("trades", "Trades")],
    },

    "resource==balance": {
        fields: [
            defineField.MultiOption("balanceAssetType", "Asset", {
                options:      assetTypeOptions,
                initialValue: "COLLATERAL",
                variant:      "tab",
            }),
        ],

        outputs: [defineOutput.Data("balance", "Balance")],

        "balanceAssetType==CONDITIONAL": {
            fields: [
                defineField.String("balanceTokenId", "Token ID", { required: true }),
            ],
        },
    },

    "resource==rewards": {
        fields: [
            defineField.MultiOption("rewardsView", "View", {
                options: [
                    { value: "earnings",    displayName: "Earnings",    description: "What each market paid you on a given day." },
                    { value: "totals",      displayName: "Totals",      description: "Your total earnings for a given day."       },
                    { value: "markets",     displayName: "Markets",     description: "Reward config of the markets you earned in." },
                    { value: "percentages", displayName: "Percentages", description: "Your current share of each reward pool."    },
                ],
                initialValue: "earnings",
            }),
        ],

        "rewardsView==earnings": {
            fields: [
                defineField.String("earningsDate", "Date", { required: true, placeholder: "2026-07-27" }),
            ],
            outputs: [defineOutput.DataList("earnings", "Earnings")],
        },

        "rewardsView==totals": {
            fields: [
                defineField.String("totalsDate", "Date", { required: true, placeholder: "2026-07-27" }),
            ],
            outputs: [defineOutput.DataList("totals", "Totals")],
        },

        "rewardsView==markets": {
            fields: [
                defineField.String("rewardMarketsDate", "Date", { required: true, placeholder: "2026-07-27" }),
            ],
            outputs: [defineOutput.DataList("markets", "Markets")],
        },

        "rewardsView==percentages": {
            outputs: [defineOutput.Data("percentages", "Percentages")],
        },
    },

    "resource==scoring": {
        fields: [
            defineField.List("scoringOrderIds", "Order IDs", {
                required: true,
                tooltip:  "Orders to check. Only resting orders can score.",
            }),
        ],
        outputs: [defineOutput.Data("scoring", "Scoring")],
    },

    "resource==settings": {
        outputs: [defineOutput.Data("settings", "Settings")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Polymarket Account Tools")],
    }),
});
