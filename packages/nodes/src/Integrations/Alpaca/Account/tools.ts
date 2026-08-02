import { tool } from "@langchain/core/tools"
import { ToolBudget } from "@pretzel-graph/node-sdk"
import { z } from "zod/v3"

import type { AlpacaAccountService } from "../services"


const limit = (fallback: number) => z.number().int().min(1).max(500)
    .default(fallback)
    .describe("Maximum records returned.")

const date = (description: string) => z.string().optional().describe(description)


export function buildTools(account: AlpacaAccountService) {

    const getSummary = tool(
        async () => ToolBudget.value(await account.summary()),
        {
            name:        "alpaca_account_summary",
            description: "Read the attached Alpaca account's status, cash, equity, buying power, margin and trading restrictions.",
            schema:      z.object({}),
        },
    )


    const getConfiguration = tool(
        async () => ToolBudget.value(await account.configuration()),
        {
            name:        "alpaca_account_configuration",
            description: "Read the attached Alpaca account's trading configuration and restrictions.",
            schema:      z.object({}),
        },
    )


    const listPositions = tool(
        async () => ToolBudget.list("positions", await account.positions.list()),
        {
            name:        "alpaca_account_positions",
            description: "List current open positions with quantities, value, cost basis and unrealized profit/loss.",
            schema:      z.object({}),
        },
    )


    const getPosition = tool(
        async ({ symbolOrId }) => ToolBudget.value(await account.positions.get(symbolOrId)),
        {
            name:        "alpaca_account_position",
            description: "Get one current position by exact symbol or asset id.",
            schema: z.object({
                symbolOrId: z.string().describe("Exact asset symbol or UUID."),
            }),
        },
    )


    const listOrders = tool(
        async ({ status, symbols, side, direction, after, until, limit }) =>
            ToolBudget.list("orders", await account.orders.list({
                status,
                symbols,
                side: side === "all" ? undefined : side,
                direction,
                after,
                until,
                limit,
            }), { hint: "Filter by status, symbols, side or time range." }),
        {
            name:        "alpaca_account_orders",
            description: "List the attached account's open or historical orders and fill progress.",
            schema: z.object({
                status:    z.enum(["open", "closed", "all"]).default("open"),
                symbols:   z.array(z.string()).optional(),
                side:      z.enum(["all", "buy", "sell"]).default("all"),
                direction: z.enum(["asc", "desc"]).default("desc"),
                after:     date("Optional ISO lower time bound."),
                until:     date("Optional ISO upper time bound."),
                limit:     limit(50),
            }),
        },
    )


    const getOrder = tool(
        async ({ orderId }) => ToolBudget.value(await account.orders.get(orderId)),
        {
            name:        "alpaca_account_order",
            description: "Get one order by Alpaca order id.",
            schema: z.object({ orderId: z.string() }),
        },
    )


    const listActivities = tool(
        async ({ activityTypes, category, direction, after, until, limit }) =>
            ToolBudget.list("activities", await account.activities({
                activityTypes,
                category: category === "all" ? undefined : category,
                direction,
                after,
                until,
                limit,
            }), { hint: "Filter by activity type or a tighter time range." }),
        {
            name:        "alpaca_account_activities",
            description: "List fills, fees, dividends, transfers and other account activities using Alpaca's activity codes.",
            schema: z.object({
                activityTypes: z.array(z.string()).optional().describe("Codes such as FILL, DIV or FEE."),
                category:      z.enum(["all", "trade_activity", "non_trade_activity"]).default("all"),
                direction:     z.enum(["asc", "desc"]).default("desc"),
                after:         date("Optional ISO lower time bound."),
                until:         date("Optional ISO upper time bound."),
                limit:         limit(50),
            }),
        },
    )


    const getPortfolio = tool(
        async ({ period, timeframe, start, end, extendedHours }) =>
            ToolBudget.value(await account.portfolio({
                period,
                timeframe,
                start,
                end,
                extendedHours,
            }), { hint: "Use a larger timeframe or shorter period for a smaller response." }),
        {
            name:        "alpaca_account_portfolio",
            description: "Get portfolio equity and profit/loss history as aligned timestamped points.",
            schema: z.object({
                period:        z.string().default("1M").describe("Examples: 1D, 1M, 3M, 1A or all."),
                timeframe:     z.string().default("1D").describe("Examples: 1Min, 5Min, 1H or 1D."),
                start:         date("Optional ISO start."),
                end:           date("Optional ISO end."),
                extendedHours: z.boolean().default(false),
            }),
        },
    )


    const listWatchlists = tool(
        async () => ToolBudget.list("watchlists", await account.watchlists.list()),
        {
            name:        "alpaca_account_watchlists",
            description: "List the attached account's watchlists.",
            schema:      z.object({}),
        },
    )


    const getWatchlist = tool(
        async ({ id, name }) => ToolBudget.value(await account.watchlists.get({ id, name })),
        {
            name:        "alpaca_account_watchlist",
            description: "Get one watchlist and its assets by id or name.",
            schema: z.object({
                id:   z.string().optional(),
                name: z.string().optional(),
            }),
        },
    )


    return [
        getSummary,
        getConfiguration,
        listPositions,
        getPosition,
        listOrders,
        getOrder,
        listActivities,
        getPortfolio,
        listWatchlists,
        getWatchlist,
    ]
}
