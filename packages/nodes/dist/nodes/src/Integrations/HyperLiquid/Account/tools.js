"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTools = buildTools;
const tools_1 = require("@langchain/core/tools");
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const v3_1 = require("zod/v3");
const address = v3_1.z.string().optional()
    .describe("Actual master or sub-account EVM address. Optional when the node has a default.");
const dex = v3_1.z.string().optional()
    .describe("Optional HIP-3 perpetual DEX. Defaults to the node setting or the original DEX.");
const account = (value, fallback) => {
    const selected = value?.trim() || fallback?.trim();
    if (!selected)
        throw new Error("Hyperliquid Account: a wallet address is required.");
    return selected;
};
function buildTools(info, defaults) {
    const getAccountState = (0, tools_1.tool)(async ({ address, dex }) => node_sdk_1.ToolBudget.value(await info.accountState({
        user: account(address, defaults.address),
        dex: dex ?? defaults.dex,
    })), {
        name: "hyperliquid_get_account_state",
        description: "Get normalized perpetual margin state and positions for an actual Hyperliquid master or sub-account address. Read-only.",
        schema: v3_1.z.object({ address, dex }),
    });
    const getSpotBalances = (0, tools_1.tool)(async ({ address }) => node_sdk_1.ToolBudget.list("balances", await info.spotBalances(account(address, defaults.address)), { hint: "Inspect a specific token from the returned list." }), {
        name: "hyperliquid_get_spot_balances",
        description: "List Hyperliquid Spot token balances, held amounts and entry notionals for an account. Read-only.",
        schema: v3_1.z.object({ address }),
    });
    const getOpenOrders = (0, tools_1.tool)(async ({ address, dex }) => node_sdk_1.ToolBudget.list("orders", await info.openOrders({
        user: account(address, defaults.address),
        dex: dex ?? defaults.dex,
    })), {
        name: "hyperliquid_get_open_orders",
        description: "List currently resting perpetual and, on the original DEX, Spot orders for a Hyperliquid account. Read-only.",
        schema: v3_1.z.object({ address, dex }),
    });
    const getFills = (0, tools_1.tool)(async ({ address, lookbackHours, maxResults, aggregateByTime }) => {
        const endTime = Date.now();
        return node_sdk_1.ToolBudget.list("fills", await info.fills({
            user: account(address, defaults.address),
            startTime: endTime - lookbackHours * 60 * 60 * 1_000,
            endTime,
            maxResults,
            aggregateByTime,
        }), { hint: "Shorten the lookback or lower maxResults." });
    }, {
        name: "hyperliquid_get_fills",
        description: "Get time-bounded recent fills for a Hyperliquid account, including prices, sizes, realized PnL and fees. Read-only.",
        schema: v3_1.z.object({
            address,
            lookbackHours: v3_1.z.number().int().min(1).max(24 * 365).default(168),
            maxResults: v3_1.z.number().int().min(1).max(2_000).default(100),
            aggregateByTime: v3_1.z.boolean().default(true),
        }),
    });
    const getFundingHistory = (0, tools_1.tool)(async ({ address, lookbackHours, maxResults }) => {
        const endTime = Date.now();
        return node_sdk_1.ToolBudget.list("payments", await info.funding({
            user: account(address, defaults.address),
            startTime: endTime - lookbackHours * 60 * 60 * 1_000,
            endTime,
            maxResults,
        }), { hint: "Shorten the lookback or lower maxResults." });
    }, {
        name: "hyperliquid_get_funding_history",
        description: "Get time-bounded perpetual funding payments received or paid by a Hyperliquid account. Read-only.",
        schema: v3_1.z.object({
            address,
            lookbackHours: v3_1.z.number().int().min(1).max(24 * 365).default(168),
            maxResults: v3_1.z.number().int().min(1).max(500).default(100),
        }),
    });
    return [getAccountState, getSpotBalances, getOpenOrders, getFills, getFundingHistory];
}
