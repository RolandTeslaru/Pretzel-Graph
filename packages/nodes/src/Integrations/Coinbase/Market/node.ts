import axios from "axios";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode } from "@vx-agent-editor/node-sdk";
import { RuntimeNode } from "@vx-agent-editor/node-sdk";
import { InferInputs, InferOutputs } from "@vx-agent-editor/node-sdk";
import { Workflow } from "@vx-agent-editor/shared/domain";

import { Blueprint, ToolBlueprint } from "./blueprint";

// ─── Pyth ────────────────────────────────────────────────────────────────────

const PYTH_BASE = "https://hermes.pyth.network/v2";

type PythPriceFeed = {
    id: string;
    attributes: {
        base: string;
        description: string;
        display_symbol: string;
        quote_currency: string;
    };
};



type PythParsedPrice = {
    id: string;
    price: { price: string; conf: string; expo: number; publish_time: number };
    ema_price: { price: string; conf: string; expo: number; publish_time: number };
};

const decodePrice = (raw: { price: string; expo: number }) =>
    parseFloat(raw.price) * Math.pow(10, raw.expo);

const searchPythFeeds = async (query: string): Promise<PythPriceFeed[]> => {
    const { data } = await axios.get<PythPriceFeed[]>(`${PYTH_BASE}/price_feeds`, {
        params: { query, asset_type: "crypto" },
    });
    return data;
};

const fetchPythPrice = async (feedId: string): Promise<PythParsedPrice> => {
    const { data } = await axios.get<{ parsed: PythParsedPrice[] }>(
        `${PYTH_BASE}/updates/price/latest`,
        { params: { "ids[]": feedId, parsed: true } }
    );
    if (!data.parsed?.length)
        throw new Error(`Pyth: no price data returned for feed ${feedId}.`);
    return data.parsed[0];
};

const getPriceForSymbol = async (symbol: string) => {
    const feeds = await searchPythFeeds(symbol);
    // Prefer an exact USD pair match
    const feed =
        feeds.find(f => f.attributes.base.toUpperCase() === symbol.toUpperCase() && f.attributes.quote_currency === "USD")
        ?? feeds[0];

    if (!feed)
        throw new Error(`Pyth: no price feed found for '${symbol}'. Try a different symbol.`);

    const parsed = await fetchPythPrice(feed.id);
    const price = decodePrice(parsed.price);
    const confidence = decodePrice(parsed.ema_price);

    return {
        symbol: feed.attributes.base,
        description: feed.attributes.description,
        feedId: feed.id,
        price,
        confidence,
        publishTime: new Date(parsed.price.publish_time * 1000).toISOString(),
    };
};

// ─── DeFiLlama ───────────────────────────────────────────────────────────────

const LLAMA_BASE = "https://api.llama.fi";

type LlamaProtocol = {
    name: string;
    description: string;
    url: string;
    symbol: string;
    chains: string[];
    currentChainTvls: Record<string, number>;
    tvl: Array<{ date: number; totalLiquidityUSD: number }>;
};

const fetchProtocol = async (slug: string) => {
    const { data } = await axios.get<LlamaProtocol>(`${LLAMA_BASE}/protocol/${slug}`);

    // tvl array can be very large — only include the latest 7 entries
    const recentTvl = data.tvl?.slice(-7).map(e => ({
        date: new Date(e.date * 1000).toISOString().split("T")[0],
        tvlUSD: e.totalLiquidityUSD,
    }));

    const currentTvl = Object.values(data.currentChainTvls ?? {}).reduce<number>(
        (sum, v) => sum + v, 0
    );

    return {
        name: data.name,
        description: data.description,
        url: data.url,
        symbol: data.symbol,
        chains: data.chains,
        currentTvlUSD: currentTvl,
        chainBreakdown: data.currentChainTvls,
        recentTvl,
    };
};


// ─── Node ─────────────────────────────────────────────────────────────────────

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { dataSource } = this.fields;
        const query = (inputs.query ?? "").trim();

        if (!query)
            throw new Error("DeFi Market Data: query input is required.");

        if (dataSource === "pyth") {
            const result = await getPriceForSymbol(query);
            return { price: result.price, data: result };
        }

        // defillama
        const result = await fetchProtocol(query.toLowerCase());
        return { price: result.currentTvlUSD, data: result };
    }

    protected override async onBuildTool(
        inputs: InferInputs<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {

        const getPrice = tool(
            async ({ symbol }) => {
                const result = await getPriceForSymbol(symbol);
                return JSON.stringify(result);
            },
            {
                name: "defi_get_price",
                description: "Get the live USD price for a crypto asset from Pyth Network. Returns price, confidence interval, and feed metadata.",
                schema: z.object({
                    symbol: z.string().describe("Crypto asset symbol, e.g. BTC, ETH, SOL, AVAX."),
                }),
            },
        );

        const getProtocolData = tool(
            async ({ protocol }) => {
                const result = await fetchProtocol(protocol.toLowerCase());
                return JSON.stringify(result);
            },
            {
                name: "defi_get_protocol_data",
                description: "Get TVL, chain breakdown, and metadata for a DeFi protocol from DeFiLlama. Useful for understanding protocol health and market position.",
                schema: z.object({
                    protocol: z.string().describe("Protocol slug as used by DeFiLlama, e.g. uniswap, aave, curve, lido, hyperliquid."),
                }),
            },
        );

        const searchAsset = tool(
            async ({ query }) => {
                const feeds = await searchPythFeeds(query);
                const summary = feeds.slice(0, 10).map(f => ({
                    feedId: f.id,
                    symbol: f.attributes.base,
                    description: f.attributes.description,
                    pair: f.attributes.display_symbol,
                }));
                return JSON.stringify(summary);
            },
            {
                name: "defi_search_asset",
                description: "Search Pyth Network for price feeds matching a keyword. Returns up to 10 results with their feed IDs. Useful when you need to find the correct symbol or verify an asset exists.",
                schema: z.object({
                    query: z.string().describe("Search keyword, e.g. 'bitcoin', 'eth', 'sol'."),
                }),
            },
        );

        return { getPrice, getProtocolData, searchAsset };
    }
}
