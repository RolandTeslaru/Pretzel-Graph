import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";

import type { HyperLiquidInfoClient } from "../client";


export type AccountToolDefaults = {
    address?: string;
    dex?:     string;
};


const address = z.string().optional()
    .describe("Actual master or sub-account EVM address. Optional when the node has a default.");

const dex = z.string().optional()
    .describe("Optional HIP-3 perpetual DEX. Defaults to the node setting or the original DEX.");

const account = (value: string | undefined, fallback: string | undefined): string => {
    const selected = value?.trim() || fallback?.trim();

    if (!selected)
        throw new Error("Hyperliquid Account: a wallet address is required.");

    return selected;
};


export function buildTools(
    info: HyperLiquidInfoClient,
    defaults: AccountToolDefaults,
) {
    const getAccountState = tool(
        async ({ address, dex }) => ToolBudget.value(
            await info.accountState({
                user: account(address, defaults.address),
                dex:  dex ?? defaults.dex,
            }),
        ),
        {
            name:        "hyperliquid_get_account_state",
            description: "Get normalized perpetual margin state and positions for an actual Hyperliquid master or sub-account address. Read-only.",
            schema: z.object({ address, dex }),
        },
    );


    const getSpotBalances = tool(
        async ({ address }) => ToolBudget.list(
            "balances",
            await info.spotBalances(account(address, defaults.address)),
            { hint: "Inspect a specific token from the returned list." },
        ),
        {
            name:        "hyperliquid_get_spot_balances",
            description: "List Hyperliquid Spot token balances, held amounts and entry notionals for an account. Read-only.",
            schema: z.object({ address }),
        },
    );


    const getOpenOrders = tool(
        async ({ address, dex }) => ToolBudget.list(
            "orders",
            await info.openOrders({
                user: account(address, defaults.address),
                dex:  dex ?? defaults.dex,
            }),
        ),
        {
            name:        "hyperliquid_get_open_orders",
            description: "List currently resting perpetual and, on the original DEX, Spot orders for a Hyperliquid account. Read-only.",
            schema: z.object({ address, dex }),
        },
    );


    const getFills = tool(
        async ({ address, lookbackHours, maxResults, aggregateByTime }) => {
            const endTime = Date.now();
            return ToolBudget.list("fills", await info.fills({
                user: account(address, defaults.address),
                startTime: endTime - lookbackHours * 60 * 60 * 1_000,
                endTime,
                maxResults,
                aggregateByTime,
            }), { hint: "Shorten the lookback or lower maxResults." });
        },
        {
            name:        "hyperliquid_get_fills",
            description: "Get time-bounded recent fills for a Hyperliquid account, including prices, sizes, realized PnL and fees. Read-only.",
            schema: z.object({
                address,
                lookbackHours:  z.number().int().min(1).max(24 * 365).default(168),
                maxResults:     z.number().int().min(1).max(2_000).default(100),
                aggregateByTime: z.boolean().default(true),
            }),
        },
    );


    const getFundingHistory = tool(
        async ({ address, lookbackHours, maxResults }) => {
            const endTime = Date.now();
            return ToolBudget.list("payments", await info.funding({
                user: account(address, defaults.address),
                startTime: endTime - lookbackHours * 60 * 60 * 1_000,
                endTime,
                maxResults,
            }), { hint: "Shorten the lookback or lower maxResults." });
        },
        {
            name:        "hyperliquid_get_funding_history",
            description: "Get time-bounded perpetual funding payments received or paid by a Hyperliquid account. Read-only.",
            schema: z.object({
                address,
                lookbackHours: z.number().int().min(1).max(24 * 365).default(168),
                maxResults:    z.number().int().min(1).max(500).default(100),
            }),
        },
    );


    return [getAccountState, getSpotBalances, getOpenOrders, getFills, getFundingHistory];
}
