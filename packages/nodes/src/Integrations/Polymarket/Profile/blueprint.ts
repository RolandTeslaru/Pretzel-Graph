import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk";


const sortDirections = [
    { value: "DESC", displayName: "Descending" },
    { value: "ASC",  displayName: "Ascending"  },
] as const;


export const Blueprint = defineBlueprint({
    id:              "Integrations.Polymarket.Profile",
    displayName:     "Polymarket Profile",
    description:     "Reads any Polymarket trader's positions, activity, and standing.",
    icon:            "Polymarket",
    accent:          "port-DataList",
    proxyCompatible: true,
    toolCompatible:  true,

    // No credential: a wallet's holdings, history and value are public, keyed by its address. Only
    // resting orders and account settings need authentication, and those live on the trading side.
    fields: [
        FieldBuilder.String("walletAddress", "Wallet Address", {
            required:    true,
            placeholder: "0x…",
            tooltip:     "The wallet to read. Any address works — it need not be yours.",
        }),
        FieldBuilder.MultiOption("resource", "Resource", {
            options: [
                { value: "positions",       displayName: "Open Positions",   description: "Currently held positions and their unrealised P&L." },
                { value: "closedPositions", displayName: "Closed Positions", description: "Settled positions and their realised P&L."          },
                { value: "activity",        displayName: "Activity",         description: "Trades, splits, merges, redemptions and transfers." },
                { value: "value",           displayName: "Portfolio Value",  description: "Total value currently held."                        },
                { value: "tradedMarkets",   displayName: "Markets Traded",   description: "How many distinct markets this wallet has traded."  },
                { value: "rank",            displayName: "Leaderboard Rank", description: "Where this wallet places on the trader leaderboard." },
                { value: "identity",        displayName: "Identity",         description: "The public profile behind the address — name, bio, badges."  },
            ],
            initialValue: "positions",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==positions": {
        fields: [
            FieldBuilder.Integer("positionsMaxResults", "Max Results", { initialValue: 100, min: 1, max: 500 }),
            FieldBuilder.Float("positionsSizeThreshold", "Minimum Size", {
                initialValue: 1,
                min:          0,
                tooltip:      "Ignores dust positions below this token count.",
            }),
            FieldBuilder.MultiOption("positionsSortBy", "Sort By", {
                options: [
                    { value: "TOKENS",     displayName: "Size"            },
                    { value: "CURRENT",    displayName: "Current Value"   },
                    { value: "INITIAL",    displayName: "Initial Value"   },
                    { value: "CASHPNL",    displayName: "P&L (cash)"      },
                    { value: "PERCENTPNL", displayName: "P&L (%)"         },
                    { value: "PRICE",      displayName: "Price"           },
                    { value: "AVGPRICE",   displayName: "Average Price"   },
                    { value: "RESOLVING",  displayName: "Resolving"       },
                    { value: "TITLE",      displayName: "Title"           },
                ],
                initialValue: "TOKENS",
            }),
            FieldBuilder.MultiOption("positionsSortDirection", "Direction", {
                options:      sortDirections,
                initialValue: "DESC",
                variant:      "tab",
            }),
            FieldBuilder.Boolean("positionsRedeemableOnly", "Redeemable Only", { initialValue: false }),
        ],
        outputs: [OutputBuilder.DataList("positions", "Positions")],
    },

    "resource==closedPositions": {
        fields: [
            FieldBuilder.Integer("closedMaxResults", "Max Results", { initialValue: 10, min: 1, max: 50 }),
            FieldBuilder.MultiOption("closedSortBy", "Sort By", {
                options: [
                    { value: "REALIZEDPNL", displayName: "Realised P&L" },
                    { value: "TIMESTAMP",   displayName: "Time"         },
                    { value: "PRICE",       displayName: "Price"        },
                    { value: "AVGPRICE",    displayName: "Average Price" },
                    { value: "TITLE",       displayName: "Title"        },
                ],
                initialValue: "REALIZEDPNL",
            }),
            FieldBuilder.MultiOption("closedSortDirection", "Direction", {
                options:      sortDirections,
                initialValue: "DESC",
                variant:      "tab",
            }),
        ],
        outputs: [OutputBuilder.DataList("positions", "Closed Positions")],
    },

    "resource==activity": {
        fields: [
            FieldBuilder.Integer("activityMaxResults", "Max Results", { initialValue: 100, min: 1, max: 500 }),
            FieldBuilder.MultiOption("activityType", "Type", {
                options: [
                    { value: "ALL",        displayName: "All"        },
                    { value: "TRADE",      displayName: "Trades"     },
                    { value: "SPLIT",      displayName: "Splits"     },
                    { value: "MERGE",      displayName: "Merges"     },
                    { value: "REDEEM",     displayName: "Redemptions" },
                    { value: "REWARD",     displayName: "Rewards"    },
                    { value: "DEPOSIT",    displayName: "Deposits"   },
                    { value: "WITHDRAWAL", displayName: "Withdrawals" },
                ],
                initialValue: "ALL",
            }),
            FieldBuilder.MultiOption("activitySortDirection", "Direction", {
                options:      sortDirections,
                initialValue: "DESC",
                variant:      "tab",
            }),
        ],
        outputs: [OutputBuilder.DataList("activity", "Activity")],
    },

    "resource==value": {
        outputs: [OutputBuilder.Data("value", "Value")],
    },

    "resource==tradedMarkets": {
        outputs: [OutputBuilder.Data("traded", "Markets Traded")],
    },

    // The one resource served by Gamma rather than the Data API — it's what turns a bare 0x… into
    // a person, so it pairs with any tool that hands back addresses.
    "resource==identity": {
        outputs: [OutputBuilder.Data("profile", "Profile")],
    },

    "resource==rank": {
        fields: [
            FieldBuilder.MultiOption("rankTimePeriod", "Period", {
                options: [
                    { value: "DAY",   displayName: "Day"       },
                    { value: "WEEK",  displayName: "Week"      },
                    { value: "MONTH", displayName: "Month"     },
                    { value: "ALL",   displayName: "All Time"  },
                ],
                initialValue: "DAY",
                variant:      "tab",
            }),
            FieldBuilder.MultiOption("rankOrderBy", "Ranked By", {
                options: [
                    { value: "PNL", displayName: "Profit" },
                    { value: "VOL", displayName: "Volume" },
                ],
                initialValue: "PNL",
                variant:      "tab",
            }),
        ],
        outputs: [OutputBuilder.DataList("leaderboard", "Leaderboard")],
    },


    // Tool mode exposes each read as its own tool; the wallet address becomes a per-call argument
    // rather than node configuration, so one node can answer questions about any address.
    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Polymarket Profile Tools")],
    }),
});
