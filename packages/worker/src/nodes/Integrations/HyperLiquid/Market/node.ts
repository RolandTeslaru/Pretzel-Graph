import axios from "axios";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode } from "src/services/Catalogue/service";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";
import { Workflow } from "@vx-agent-editor/shared/domain";

import { Blueprint, ToolBlueprint } from "./blueprint";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

type Candle = { t: number; T: number; s: string; i: string; o: string; c: string; h: string; l: string; v: string; n: number };

const post = async <T>(payload: Record<string, unknown>): Promise<T> => {
    const { data } = await axios.post<T>(HYPERLIQUID_INFO_URL, payload, {
        headers: { "Content-Type": "application/json" },
    });
    return data;
};

const summarizeCandles = (coin: string, interval: string, candles: Candle[]) => {
    if (!candles.length) {
        return { coin, interval, count: 0, firstClose: null, lastClose: null, change: null, changePct: null };
    }
    const firstClose = parseFloat(candles[0].c);
    const lastClose = parseFloat(candles[candles.length - 1].c);
    const change = lastClose - firstClose;
    const changePct = firstClose === 0 ? null : (change / firstClose) * 100;
    return { coin, interval, count: candles.length, firstClose, lastClose, change, changePct };
};

const fetchCandles = async (coin: string, interval: string, lookbackHours: number): Promise<Candle[]> => {
    const endTime = Date.now();
    const startTime = endTime - lookbackHours * 60 * 60 * 1000;
    return post<Candle[]>({
        type: "candleSnapshot",
        req: { coin, interval, startTime, endTime },
    });
};


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node, context: ExecutionContext) {
        super(workflowNode, context);
    }

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { interval, lookbackHours } = this.fields;
        const coin = (inputs.coin ?? "").trim();

        if (!coin)
            throw new Error("HyperLiquid Market: 'coin' input is required (e.g. BTC, ETH).");

        const candles = await fetchCandles(coin, interval, lookbackHours);
        const summary = summarizeCandles(coin, interval, candles);

        return { candles, summary };
    }

    protected override async onBuildTool(
        context: ExecutionContext,
        inputs: InferInputs<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        const { interval: defaultInterval, lookbackHours: defaultLookback } = this.fields;

        const getCandles = tool(
            async ({ coin, interval, lookbackHours }) => {
                const candles = await fetchCandles(
                    coin,
                    interval ?? defaultInterval,
                    lookbackHours ?? defaultLookback,
                );
                return JSON.stringify(summarizeCandles(coin, interval ?? defaultInterval, candles));
            },
            {
                name: "hyperliquid_get_candles",
                description: "Download OHLCV candle history from HyperLiquid for a given coin. Returns a summary (count, first/last close, change, change %). Use this to inspect recent price action.",
                schema: z.object({
                    coin: z.string().describe("HyperLiquid coin symbol, e.g. BTC, ETH, SOL."),
                    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).optional().describe("Candle interval. Defaults to the node's configured interval."),
                    lookbackHours: z.number().int().min(1).max(24 * 365).optional().describe("How far back to fetch, in hours. Defaults to the node's configured lookback."),
                }),
            },
        );

        const getMids = tool(
            async ({ coin }) => {
                const mids = await post<Record<string, string>>({ type: "allMids" });
                if (coin) {
                    const price = mids[coin];
                    return price ? `${coin}: ${price}` : `No mid price found for ${coin}.`;
                }
                return JSON.stringify(mids);
            },
            {
                name: "hyperliquid_get_mids",
                description: "Get current mid prices on HyperLiquid. Pass a coin symbol to get just one, or omit to get all.",
                schema: z.object({
                    coin: z.string().optional().describe("Optional coin symbol. If omitted, returns mids for every coin."),
                }),
            },
        );

        const getOrderBook = tool(
            async ({ coin }) => {
                const book = await post<unknown>({ type: "l2Book", coin });
                return JSON.stringify(book);
            },
            {
                name: "hyperliquid_get_order_book",
                description: "Snapshot the L2 order book for a coin on HyperLiquid. Returns bids and asks.",
                schema: z.object({
                    coin: z.string().describe("HyperLiquid coin symbol, e.g. BTC."),
                }),
            },
        );

        const getMeta = tool(
            async () => {
                const meta = await post<unknown>({ type: "metaAndAssetCtxs" });
                return JSON.stringify(meta);
            },
            {
                name: "hyperliquid_get_meta",
                description: "List all coins available on HyperLiquid along with their metadata and market context (mark price, funding, open interest).",
                schema: z.object({}),
            },
        );

        return { getCandles, getMids, getOrderBook, getMeta };
    }
}
