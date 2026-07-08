import {
    createWalletClient,
    createPublicClient,
    http,
    type Chain,
    type WalletClient,
    type PublicClient,
    type Hex,
    fromHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, polygon, arbitrum, base, optimism, avalanche, celo } from "viem/chains";

import axios from "axios";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";

const UNISWAP_API_BASE = "https://trade-api.gateway.uniswap.org/v1";

const CHAIN_MAP: Record<string, Chain> = {
    "1": mainnet,
    "137": polygon,
    "42161": arbitrum,
    "8453": base,
    "10": optimism,
    "43114": avalanche,
    "42220": celo,
};

type UniswapClients = {
    wallet: WalletClient;
    public: PublicClient;
    chainId: number;
};

const uniswapPost = async <T>(apiKey: string, endpoint: string, body: unknown): Promise<T> => {
    const { data } = await axios.post<T>(`${UNISWAP_API_BASE}/${endpoint}`, body, {
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
        },
    });
    return data;
};

const buildClients = (fields: {
    privateKey: string;
    chain: string;
    rpcUrl: string;
}): UniswapClients => {
    if (!fields.privateKey)
        throw new Error("Uniswap: a private key is required to sign transactions.");

    const chain = CHAIN_MAP[fields.chain];
    if (!chain)
        throw new Error(`Uniswap: unsupported chain id '${fields.chain}'.`);

    const transport = fields.rpcUrl ? http(fields.rpcUrl) : http();
    const account = privateKeyToAccount(fields.privateKey as Hex);

    return {
        wallet: createWalletClient({ account, chain, transport }),
        public: createPublicClient({ chain, transport }),
        chainId: chain.id,
    };
};

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    private clients!: UniswapClients;

    constructor(workflowNode: Workflow.Node.Raw, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
        const { privateKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.uniswapApi.blob);
        this.clients = buildClients({ ...this.fieldValues, privateKey });
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { wallet, public: publicClient, chainId } = this.clients;
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.uniswapApi.blob);
        const address = wallet.account!.address;

        const checkApproval = tool(
            async ({ token, amount }) => {
                const data = await uniswapPost<any>(apiKey, "check_approval", {
                    token,
                    amount,
                    walletAddress: address,
                    chainId,
                });

                const approval = data.approval;
                if (!approval) {
                    return JSON.stringify({ status: "approved" });
                }

                const txHash = await wallet.sendTransaction({
                    to: approval.to as Hex,
                    value: fromHex(approval.value as Hex, "bigint"),
                    data: approval.data as Hex,
                    chain: wallet.chain,
                    account: wallet.account!,
                });

                await publicClient.waitForTransactionReceipt({ hash: txHash });

                return JSON.stringify({ status: "approved", txHash });
            },
            {
                name: "uniswap_check_approval",
                description: "Check if the wallet has enough approval for a token and submit the approval transaction if needed. Must be called before swapping.",
                schema: z.object({
                    token: z.string().describe("Token contract address to approve (e.g. 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 for USDC on mainnet)."),
                    amount: z.string().describe("Amount to approve in base units (wei / smallest denomination)."),
                }),
            },
        );

        const getQuote = tool(
            async ({ tokenIn, tokenOut, amount, type }) => {
                const quote = await uniswapPost<any>(apiKey, "quote", {
                    tokenInChainId: chainId,
                    tokenOutChainId: chainId,
                    tokenIn,
                    tokenOut,
                    amount,
                    type: type ?? "EXACT_INPUT",
                    swapper: address,
                });
                return JSON.stringify(quote);
            },
            {
                name: "uniswap_get_quote",
                description: "Get a swap quote from Uniswap. Returns the expected output amount, price impact, and gas estimate. Does not execute a trade.",
                schema: z.object({
                    tokenIn: z.string().describe("Input token contract address."),
                    tokenOut: z.string().describe("Output token contract address."),
                    amount: z.string().describe("Amount in base units (wei). For EXACT_INPUT this is the input amount; for EXACT_OUTPUT it is the desired output amount."),
                    type: z.enum(["EXACT_INPUT", "EXACT_OUTPUT"]).optional().describe("Swap type. Defaults to EXACT_INPUT."),
                }),
            },
        );

        const swapTokens = tool(
            async ({ tokenIn, tokenOut, amount, type }) => {
                // Step 1: get quote + permit data
                const quoteResponse = await uniswapPost<any>(apiKey, "quote", {
                    tokenInChainId: chainId,
                    tokenOutChainId: chainId,
                    tokenIn,
                    tokenOut,
                    amount,
                    type: type ?? "EXACT_INPUT",
                    swapper: address,
                });

                const { quote, permitData } = quoteResponse;

                // Step 2: sign permit if required
                let signature: string | undefined;
                if (permitData) {
                    signature = await wallet.signTypedData({
                        account: wallet.account!,
                        domain: permitData.domain,
                        types: permitData.types,
                        primaryType: "PermitSingle",
                        message: permitData.values,
                    });
                }

                // Step 3: submit swap
                const swapResponse = await uniswapPost<any>(apiKey, "swap", {
                    signature,
                    quote,
                    permitData: permitData ?? undefined,
                });

                const swap = swapResponse.swap;

                const txHash = await wallet.sendTransaction({
                    to: swap.to as Hex,
                    value: fromHex(swap.value as Hex, "bigint"),
                    data: swap.data as Hex,
                    chain: wallet.chain,
                    account: wallet.account!,
                });

                await publicClient.waitForTransactionReceipt({ hash: txHash });

                return JSON.stringify({ status: "swapped", txHash });
            },
            {
                name: "uniswap_swap_tokens",
                description: "Swap tokens on Uniswap. Make sure to call uniswap_check_approval for the input token before calling this. Handles permit signing and transaction submission automatically.",
                schema: z.object({
                    tokenIn: z.string().describe("Input token contract address."),
                    tokenOut: z.string().describe("Output token contract address."),
                    amount: z.string().describe("Amount in base units (wei). For EXACT_INPUT this is the input amount; for EXACT_OUTPUT it is the desired output amount."),
                    type: z.enum(["EXACT_INPUT", "EXACT_OUTPUT"]).optional().describe("Swap type. Defaults to EXACT_INPUT."),
                }),
            },
        );

        return { tools: [checkApproval, getQuote, swapTokens] };
    }
}
