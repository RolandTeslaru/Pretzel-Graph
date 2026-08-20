"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTools = buildTools;
const tools_1 = require("@langchain/core/tools");
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const v3_1 = require("zod/v3");
// Every tool here reads the one account the credential belongs to, so none of them take a wallet.
// That's the difference from the Profile tools, which read any address and take one per call.
const marketParam = v3_1.z.string().optional()
    .describe("Condition ID of a market (0x…, 64 hex characters). Omit for every market.");
const tokenParam = v3_1.z.string().optional()
    .describe("Token ID of one outcome. Narrows the result to a single side of a market.");
const dateParam = v3_1.z.string()
    .describe("Day to report on, as YYYY-MM-DD.");
function buildTools(clob) {
    const getOpenOrders = (0, tools_1.tool)(async ({ market, tokenId }) => {
        const orders = await clob.orders.listOpen({
            market: market,
            asset_id: tokenId,
        });
        return node_sdk_1.ToolBudget.list("orders", orders, { hint: "Filter by market or token." });
    }, {
        name: "polymarket_account_open_orders",
        description: "List your own orders currently resting on the order book, with their price, size and how much has filled. Use this to see what you have working right now.",
        schema: v3_1.z.object({
            market: marketParam,
            tokenId: tokenParam,
        }),
    });
    const getOrder = (0, tools_1.tool)(async ({ orderId }) => {
        const order = await clob.orders.get({ order_id: orderId });
        return node_sdk_1.ToolBudget.value(order);
    }, {
        name: "polymarket_account_order",
        description: "Get one of your orders by its id, including current status and fill progress. Use this to follow up on an order returned by another tool.",
        schema: v3_1.z.object({
            orderId: v3_1.z.string().describe("The order's id."),
        }),
    });
    const getTrades = (0, tools_1.tool)(async ({ market, tokenId }) => {
        const trades = await clob.trades.list({
            market: market,
            asset_id: tokenId,
            only_first_page: true,
        });
        return node_sdk_1.ToolBudget.list("trades", trades, { hint: "Filter by market or token." });
    }, {
        name: "polymarket_account_trades",
        description: "List your own recent fills as recorded by the exchange — price, size, side and fees. Use this for what actually executed, as opposed to what is still resting.",
        schema: v3_1.z.object({
            market: marketParam,
            tokenId: tokenParam,
        }),
    });
    const getBalance = (0, tools_1.tool)(async ({ asset, tokenId }) => {
        const balance = await clob.balances.getAllowance({
            asset_type: asset,
            token_id: asset === "CONDITIONAL" ? tokenId : undefined,
        });
        return node_sdk_1.ToolBudget.value(balance);
    }, {
        name: "polymarket_account_balance",
        description: "Get your cash balance, or your holding of one outcome token, together with the amount the exchange is currently allowed to move. Use this to check available funds before reasoning about a trade.",
        schema: v3_1.z.object({
            asset: v3_1.z.enum(["COLLATERAL", "CONDITIONAL"]).default("COLLATERAL")
                .describe("COLLATERAL for your USDC cash balance, CONDITIONAL for one outcome token."),
            tokenId: v3_1.z.string().optional()
                .describe("Token ID. Required when asset is CONDITIONAL, ignored otherwise."),
        }),
    });
    const getRewards = (0, tools_1.tool)(async ({ view, date }) => {
        if (view === "percentages")
            return node_sdk_1.ToolBudget.value(await clob.rewards.getPercentages());
        if (!date)
            throw new Error(`polymarket_account_rewards: "${view}" needs a date.`);
        if (view === "earnings")
            return node_sdk_1.ToolBudget.value(await clob.rewards.listDailyEarnings({ date }));
        if (view === "totals")
            return node_sdk_1.ToolBudget.value(await clob.rewards.listDailyTotals({ date }));
        return node_sdk_1.ToolBudget.value(await clob.rewards.listUserMarkets({ date }));
    }, {
        name: "polymarket_account_rewards",
        description: "Read what you have earned for providing liquidity: per-market earnings for a day, your total for a day, the reward configuration of the markets you earned in, or your current share of each reward pool.",
        schema: v3_1.z.object({
            view: v3_1.z.enum(["earnings", "totals", "markets", "percentages"]).default("earnings")
                .describe("earnings: per-market for one day. totals: your total for one day. markets: reward config of the markets you earned in. percentages: your current pool share, no date needed."),
            date: dateParam.optional()
                .describe("Day to report on, as YYYY-MM-DD. Required for every view except percentages."),
        }),
    });
    const getOrderScoring = (0, tools_1.tool)(async ({ orderIds }) => {
        const scoring = await clob.orders.areScoring({ order_ids: orderIds });
        return node_sdk_1.ToolBudget.value(scoring);
    }, {
        name: "polymarket_account_order_scoring",
        description: "Check whether given orders currently count towards liquidity rewards. Only resting orders can score, so pair this with the open-orders tool.",
        schema: v3_1.z.object({
            orderIds: v3_1.z.array(v3_1.z.string()).min(1)
                .describe("Order ids to check."),
        }),
    });
    const getSettings = (0, tools_1.tool)(async () => {
        const settings = await clob.account.getClosedOnlyMode();
        return node_sdk_1.ToolBudget.value(settings);
    }, {
        name: "polymarket_account_settings",
        description: "Check whether the account is restricted to closing existing positions only. Use this if an order seems like it would be rejected.",
        schema: v3_1.z.object({}),
    });
    return [
        getOpenOrders,
        getOrder,
        getTrades,
        getBalance,
        getRewards,
        getOrderScoring,
        getSettings,
    ];
}
