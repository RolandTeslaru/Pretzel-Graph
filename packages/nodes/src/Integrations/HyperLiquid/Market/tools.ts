import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";

import type { HyperLiquidInfoClient } from "../client";
import type { HyperLiquid } from "../domain";


const interval = z.enum([
    "1m", "3m", "5m", "15m", "30m",
    "1h", "2h", "4h", "8h", "12h",
    "1d", "3d", "1w", "1M",
]);

const limit = (fallback: number, maximum: number) => z.number().int().min(1).max(maximum)
    .default(fallback)
    .describe("Maximum records to return.");


export const selectMids = (
    mids: readonly HyperLiquid.Mid[],
    coin: string | undefined,
    maxResults: number,
): HyperLiquid.Mid[] => {
    const query = coin?.trim().toLowerCase();
    const selected = query
        ? mids.filter(mid => mid.coin.toLowerCase() === query)
        : mids;

    return selected.slice(0, maxResults);
};


export function buildTools(
    info: HyperLiquidInfoClient,
) {
    const listMarkets = tool(
        async ({ kind, dex, limit }) => {
            const markets = kind === "spot"
                ? await info.spotMarkets()
                : await info.perpetualMarkets({ dex });

            return ToolBudget.list("markets", markets.slice(0, limit), {
                hint: "Lower the limit or select the other market type.",
            });
        },
        {
            name:        "hyperliquid_list_markets",
            description: "List normalized Hyperliquid perpetual or Spot markets ordered by 24-hour notional volume. Perpetual results include leverage, funding, open interest and mark/oracle prices; Spot results include pair and token metadata.",
            schema: z.object({
                kind: z.enum(["perpetual", "spot"]).default("perpetual"),
                dex:  z.string().optional().describe("Optional HIP-3 perpetual DEX. Ignored for Spot."),
                limit: limit(50, 500),
            }),
        },
    );


    const getMids = tool(
        async ({ coin, dex, limit }) => {
            const mids = await info.mids({ dex });
            return ToolBudget.list("mids", selectMids(mids, coin, limit), {
                hint: "Pass an exact coin/pair or lower the limit.",
            });
        },
        {
            name:        "hyperliquid_get_mids",
            description: "Get current Hyperliquid mid prices. Pass an exact perpetual symbol, Spot pair/@index, or HIP-3 coin to return one reading; omit it to browse a bounded list.",
            schema: z.object({
                coin: z.string().optional(),
                dex:  z.string().optional().describe("Optional HIP-3 perpetual DEX."),
                limit: limit(100, 1_000),
            }),
        },
    );


    const getCandles = tool(
        async ({ coin, interval, lookbackHours }) => {
            const endTime = Date.now();
            const candles = await info.candles({
                coin,
                interval,
                startTime: endTime - lookbackHours * 60 * 60 * 1_000,
                endTime,
            });

            return ToolBudget.list("candles", candles, {
                hint: "Use a wider interval or shorter lookback to reduce candle count.",
            });
        },
        {
            name:        "hyperliquid_get_candles",
            description: "Get normalized Hyperliquid OHLCV candles. The exchange retains only a bounded recent candle history.",
            schema: z.object({
                coin: z.string().describe("Perpetual symbol, Spot pair/@index, or HIP-3 dex:coin name."),
                interval: interval.default("1h"),
                lookbackHours: z.number().int().min(1).max(24 * 365).default(24),
            }),
        },
    );


    const getOrderBook = tool(
        async ({ coin, depth }) => ToolBudget.value(
            await info.orderBook({ coin, depth }),
            { hint: "Lower the requested depth." },
        ),
        {
            name:        "hyperliquid_get_order_book",
            description: "Get a normalized L2 order book with best-first bids and asks, best prices, spread and total level counts.",
            schema: z.object({
                coin:  z.string().describe("Perpetual symbol, Spot pair/@index, or HIP-3 dex:coin name."),
                depth: z.number().int().min(1).max(20).default(15),
            }),
        },
    );


    return [listMarkets, getMids, getCandles, getOrderBook];
}
