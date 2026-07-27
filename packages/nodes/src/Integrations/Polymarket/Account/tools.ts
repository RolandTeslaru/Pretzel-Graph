import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";

import type { PolymarketReadOnlyCLOBClient } from "../client";


// Every tool here reads the one account the credential belongs to, so none of them take a wallet.
// That's the difference from the Profile tools, which read any address and take one per call.
const marketParam = z.string().optional()
    .describe("Condition ID of a market (0x…, 64 hex characters). Omit for every market.");

const tokenParam = z.string().optional()
    .describe("Token ID of one outcome. Narrows the result to a single side of a market.");

const dateParam = z.string()
    .describe("Day to report on, as YYYY-MM-DD.");


export function buildTools(clob: PolymarketReadOnlyCLOBClient) {

    const getOpenOrders = tool(
        async ({ market, tokenId }) => {
            const orders = await clob.orders.listOpen({
                market:   market,
                asset_id: tokenId,
            });

            return ToolBudget.list("orders", orders, { hint: "Filter by market or token." });
        },
        {
            name:        "polymarket_account_open_orders",
            description: "List your own orders currently resting on the order book, with their price, size and how much has filled. Use this to see what you have working right now.",
            schema: z.object({
                market:  marketParam,
                tokenId: tokenParam,
            }),
        },
    );

    const getOrder = tool(
        async ({ orderId }) => {
            const order = await clob.orders.get({ order_id: orderId });

            return ToolBudget.value(order);
        },
        {
            name:        "polymarket_account_order",
            description: "Get one of your orders by its id, including current status and fill progress. Use this to follow up on an order returned by another tool.",
            schema: z.object({
                orderId: z.string().describe("The order's id."),
            }),
        },
    );

    const getTrades = tool(
        async ({ market, tokenId }) => {
            const trades = await clob.trades.list({
                market:          market,
                asset_id:        tokenId,
                only_first_page: true,
            });

            return ToolBudget.list("trades", trades, { hint: "Filter by market or token." });
        },
        {
            name:        "polymarket_account_trades",
            description: "List your own recent fills as recorded by the exchange — price, size, side and fees. Use this for what actually executed, as opposed to what is still resting.",
            schema: z.object({
                market:  marketParam,
                tokenId: tokenParam,
            }),
        },
    );

    const getBalance = tool(
        async ({ asset, tokenId }) => {
            const balance = await clob.balances.getAllowance({
                asset_type: asset,
                token_id:   asset === "CONDITIONAL" ? tokenId : undefined,
            });

            return ToolBudget.value(balance);
        },
        {
            name:        "polymarket_account_balance",
            description: "Get your cash balance, or your holding of one outcome token, together with the amount the exchange is currently allowed to move. Use this to check available funds before reasoning about a trade.",
            schema: z.object({
                asset:   z.enum(["COLLATERAL", "CONDITIONAL"]).default("COLLATERAL")
                    .describe("COLLATERAL for your USDC cash balance, CONDITIONAL for one outcome token."),
                tokenId: z.string().optional()
                    .describe("Token ID. Required when asset is CONDITIONAL, ignored otherwise."),
            }),
        },
    );

    const getRewards = tool(
        async ({ view, date }) => {
            if (view === "percentages")
                return ToolBudget.value(await clob.rewards.getPercentages());

            if (!date)
                throw new Error(`polymarket_account_rewards: "${view}" needs a date.`);

            if (view === "earnings")
                return ToolBudget.value(await clob.rewards.listDailyEarnings({ date }));

            if (view === "totals")
                return ToolBudget.value(await clob.rewards.listDailyTotals({ date }));

            return ToolBudget.value(await clob.rewards.listUserMarkets({ date }));
        },
        {
            name:        "polymarket_account_rewards",
            description: "Read what you have earned for providing liquidity: per-market earnings for a day, your total for a day, the reward configuration of the markets you earned in, or your current share of each reward pool.",
            schema: z.object({
                view: z.enum(["earnings", "totals", "markets", "percentages"]).default("earnings")
                    .describe("earnings: per-market for one day. totals: your total for one day. markets: reward config of the markets you earned in. percentages: your current pool share, no date needed."),
                date: dateParam.optional()
                    .describe("Day to report on, as YYYY-MM-DD. Required for every view except percentages."),
            }),
        },
    );

    const getOrderScoring = tool(
        async ({ orderIds }) => {
            const scoring = await clob.orders.areScoring({ order_ids: orderIds });

            return ToolBudget.value(scoring);
        },
        {
            name:        "polymarket_account_order_scoring",
            description: "Check whether given orders currently count towards liquidity rewards. Only resting orders can score, so pair this with the open-orders tool.",
            schema: z.object({
                orderIds: z.array(z.string()).min(1)
                    .describe("Order ids to check."),
            }),
        },
    );

    const getSettings = tool(
        async () => {
            const settings = await clob.account.getClosedOnlyMode();

            return ToolBudget.value(settings);
        },
        {
            name:        "polymarket_account_settings",
            description: "Check whether the account is restricted to closing existing positions only. Use this if an order seems like it would be rejected.",
            schema: z.object({}),
        },
    );


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
