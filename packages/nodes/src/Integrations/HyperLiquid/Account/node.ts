import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { Blueprint, ToolBlueprint } from "./blueprint";
import { ClearinghouseState, HyperLiquidPublicClient } from "../publicClient";

const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);

const requireAddress = (raw: string | undefined, fallback?: string): string => {
    const addr = (raw && raw.trim()) || (fallback && fallback.trim()) || "";
    if (!addr)
        throw new Error("HyperLiquid Account: a wallet address is required.");
    if (!isAddress(addr))
        throw new Error(`HyperLiquid Account: invalid wallet address '${addr}'. Expected an EVM 0x-prefixed 40-hex address.`);
    return addr.toLowerCase();
};

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    private readonly client: HyperLiquidPublicClient;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
        this.client = new HyperLiquidPublicClient(this.httpClientFactory);
    }

    protected override async onRun(): Promise<InferOutputs<typeof Blueprint>> {
        const address = requireAddress(this.fieldValues.address);

        const [state, openOrders] = await Promise.all([
            this.client.clearinghouseState(address),
            this.client.openOrders(address),
        ]);

        const positions = (state.assetPositions ?? []).map(p => p.position);

        return { state, positions, openOrders };
    }

    protected override async onBuildTool(
        incoming: InferIncoming<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        const defaultAddress = this.fieldValues.address;

        const addressSchema = z.object({
            address: z.string().optional().describe("EVM 0x wallet address. Optional if a default is configured on the node."),
        });

        const getAccountState = tool(
            async ({ address }) => {
                const user = requireAddress(address, defaultAddress);
                const state = await this.client.clearinghouseState(user);
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
                const orders = await this.client.openOrders(user);
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
                const fills = await this.client.userFills(user);
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
                const funding = await this.client.userFunding(user, startTime);
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
