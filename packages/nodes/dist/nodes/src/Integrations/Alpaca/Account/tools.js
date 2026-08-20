"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTools = buildTools;
const tools_1 = require("@langchain/core/tools");
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const v3_1 = require("zod/v3");
const limit = (fallback) => v3_1.z.number().int().min(1).max(500)
    .default(fallback)
    .describe("Maximum records returned.");
const date = (description) => v3_1.z.string().optional().describe(description);
function buildTools(account) {
    const getSummary = (0, tools_1.tool)(async () => node_sdk_1.ToolBudget.value(await account.summary()), {
        name: "alpaca_account_summary",
        description: "Read the attached Alpaca account's status, cash, equity, buying power, margin and trading restrictions.",
        schema: v3_1.z.object({}),
    });
    const getConfiguration = (0, tools_1.tool)(async () => node_sdk_1.ToolBudget.value(await account.configuration()), {
        name: "alpaca_account_configuration",
        description: "Read the attached Alpaca account's trading configuration and restrictions.",
        schema: v3_1.z.object({}),
    });
    const listPositions = (0, tools_1.tool)(async () => node_sdk_1.ToolBudget.list("positions", await account.positions.list()), {
        name: "alpaca_account_positions",
        description: "List current open positions with quantities, value, cost basis and unrealized profit/loss.",
        schema: v3_1.z.object({}),
    });
    const getPosition = (0, tools_1.tool)(async ({ symbolOrId }) => node_sdk_1.ToolBudget.value(await account.positions.get(symbolOrId)), {
        name: "alpaca_account_position",
        description: "Get one current position by exact symbol or asset id.",
        schema: v3_1.z.object({
            symbolOrId: v3_1.z.string().describe("Exact asset symbol or UUID."),
        }),
    });
    const listOrders = (0, tools_1.tool)(async ({ status, symbols, side, direction, after, until, limit }) => node_sdk_1.ToolBudget.list("orders", await account.orders.list({
        status,
        symbols,
        side: side === "all" ? undefined : side,
        direction,
        after,
        until,
        limit,
    }), { hint: "Filter by status, symbols, side or time range." }), {
        name: "alpaca_account_orders",
        description: "List the attached account's open or historical orders and fill progress.",
        schema: v3_1.z.object({
            status: v3_1.z.enum(["open", "closed", "all"]).default("open"),
            symbols: v3_1.z.array(v3_1.z.string()).optional(),
            side: v3_1.z.enum(["all", "buy", "sell"]).default("all"),
            direction: v3_1.z.enum(["asc", "desc"]).default("desc"),
            after: date("Optional ISO lower time bound."),
            until: date("Optional ISO upper time bound."),
            limit: limit(50),
        }),
    });
    const getOrder = (0, tools_1.tool)(async ({ orderId }) => node_sdk_1.ToolBudget.value(await account.orders.get(orderId)), {
        name: "alpaca_account_order",
        description: "Get one order by Alpaca order id.",
        schema: v3_1.z.object({ orderId: v3_1.z.string() }),
    });
    const listActivities = (0, tools_1.tool)(async ({ activityTypes, category, direction, after, until, limit }) => node_sdk_1.ToolBudget.list("activities", await account.activities({
        activityTypes,
        category: category === "all" ? undefined : category,
        direction,
        after,
        until,
        limit,
    }), { hint: "Filter by activity type or a tighter time range." }), {
        name: "alpaca_account_activities",
        description: "List fills, fees, dividends, transfers and other account activities using Alpaca's activity codes.",
        schema: v3_1.z.object({
            activityTypes: v3_1.z.array(v3_1.z.string()).optional().describe("Codes such as FILL, DIV or FEE."),
            category: v3_1.z.enum(["all", "trade_activity", "non_trade_activity"]).default("all"),
            direction: v3_1.z.enum(["asc", "desc"]).default("desc"),
            after: date("Optional ISO lower time bound."),
            until: date("Optional ISO upper time bound."),
            limit: limit(50),
        }),
    });
    const getPortfolio = (0, tools_1.tool)(async ({ period, timeframe, start, end, extendedHours }) => node_sdk_1.ToolBudget.value(await account.portfolio({
        period,
        timeframe,
        start,
        end,
        extendedHours,
    }), { hint: "Use a larger timeframe or shorter period for a smaller response." }), {
        name: "alpaca_account_portfolio",
        description: "Get portfolio equity and profit/loss history as aligned timestamped points.",
        schema: v3_1.z.object({
            period: v3_1.z.string().default("1M").describe("Examples: 1D, 1M, 3M, 1A or all."),
            timeframe: v3_1.z.string().default("1D").describe("Examples: 1Min, 5Min, 1H or 1D."),
            start: date("Optional ISO start."),
            end: date("Optional ISO end."),
            extendedHours: v3_1.z.boolean().default(false),
        }),
    });
    const listWatchlists = (0, tools_1.tool)(async () => node_sdk_1.ToolBudget.list("watchlists", await account.watchlists.list()), {
        name: "alpaca_account_watchlists",
        description: "List the attached account's watchlists.",
        schema: v3_1.z.object({}),
    });
    const getWatchlist = (0, tools_1.tool)(async ({ id, name }) => node_sdk_1.ToolBudget.value(await account.watchlists.get({ id, name })), {
        name: "alpaca_account_watchlist",
        description: "Get one watchlist and its assets by id or name.",
        schema: v3_1.z.object({
            id: v3_1.z.string().optional(),
            name: v3_1.z.string().optional(),
        }),
    });
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
    ];
}
