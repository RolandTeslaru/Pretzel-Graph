import axios from "axios";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode } from "src/services/Catalogue/service";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";
import { Workflow } from "@pretzel-graph/shared/domain";

import { Blueprint, ToolBlueprint } from "./blueprint";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

const post = async <T>(payload: Record<string, unknown>): Promise<T> => {
    const { data } = await axios.post<T>(HYPERLIQUID_INFO_URL, payload, {
        headers: { "Content-Type": "application/json" },
    });
    return data;
};

const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);

const requireAddress = (raw: string | undefined, fallback?: string): string => {
    const addr = (raw && raw.trim()) || (fallback && fallback.trim()) || "";
    if (!addr)
        throw new Error("HyperLiquid Account: a wallet address is required.");
    if (!isAddress(addr))
        throw new Error(`HyperLiquid Account: invalid wallet address '${addr}'. Expected an EVM 0x-prefixed 40-hex address.`);
    return addr.toLowerCase();
};

type ClearinghouseState = {
    marginSummary?: unknown;
    crossMarginSummary?: unknown;
    withdrawable?: string;
    assetPositions?: Array<{ position: unknown; type: string }>;
};


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const address = requireAddress(inputs.address, this.fields.defaultAddress);

        const [state, openOrders] = await Promise.all([
            post<ClearinghouseState>({ type: "clearinghouseState", user: address }),
            post<unknown[]>({ type: "openOrders", user: address }),
        ]);

        const positions = (state.assetPositions ?? []).map(p => p.position);

        return { state, positions, openOrders };
    }

    protected override async onBuildTool(
        inputs: InferInputs<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        const { defaultAddress } = this.fields;

        const addressSchema = z.object({
            address: z.string().optional().describe("EVM 0x wallet address. Optional if a default is configured on the node."),
        });

        const getAccountState = tool(
            async ({ address }) => {
                const user = requireAddress(address, defaultAddress);
                const state = await post<ClearinghouseState>({ type: "clearinghouseState", user });
                return JSON.stringify(state);
            },
            {
                name: "hyperliquid_get_account_state",
                description: "Fetch HyperLiquid clearinghouse state for a wallet: margin summary, asset positions, withdrawable balance. Read-only.",
                schema: addressSchema,
            },
        );

        const getOpenOrders = tool(
            async ({ address }) => {
                const user = requireAddress(address, defaultAddress);
                const orders = await post<unknown[]>({ type: "openOrders", user });
                return JSON.stringify(orders);
            },
            {
                name: "hyperliquid_get_open_orders",
                description: "List currently resting (open) orders for a HyperLiquid wallet. Read-only.",
                schema: addressSchema,
            },
        );

        const getFills = tool(
            async ({ address }) => {
                const user = requireAddress(address, defaultAddress);
                const fills = await post<unknown[]>({ type: "userFills", user });
                return JSON.stringify(fills);
            },
            {
                name: "hyperliquid_get_fills",
                description: "Fetch recent executed trades (fills) for a HyperLiquid wallet. Read-only.",
                schema: addressSchema,
            },
        );

        const getFundingHistory = tool(
            async ({ address, lookbackHours }) => {
                const user = requireAddress(address, defaultAddress);
                const startTime = Date.now() - lookbackHours * 60 * 60 * 1000;
                const funding = await post<unknown[]>({ type: "userFunding", user, startTime });
                return JSON.stringify(funding);
            },
            {
                name: "hyperliquid_get_funding_history",
                description: "Fetch funding payments received or paid by a HyperLiquid wallet over a lookback window. Read-only.",
                schema: z.object({
                    address: z.string().optional().describe("EVM 0x wallet address. Optional if a default is configured on the node."),
                    lookbackHours: z.number().int().min(1).max(24 * 365).default(168).describe("How far back to look, in hours. Defaults to 168 (one week)."),
                }),
            },
        );

        return { getAccountState, getOpenOrders, getFills, getFundingHistory };
    }
}
