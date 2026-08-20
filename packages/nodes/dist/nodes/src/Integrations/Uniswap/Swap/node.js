"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
const tools_1 = require("@langchain/core/tools");
const v3_1 = require("zod/v3");
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const UNISWAP_API_BASE = "https://trade-api.gateway.uniswap.org/v1";
const CHAIN_MAP = {
    "1": chains_1.mainnet,
    "137": chains_1.polygon,
    "42161": chains_1.arbitrum,
    "8453": chains_1.base,
    "10": chains_1.optimism,
    "43114": chains_1.avalanche,
    "42220": chains_1.celo,
};
// The API key is a constant header, so it's bound once here rather than threaded per call.
const createTradeApiClient = (http, apiKey) => http.create({
    vendor: "Uniswap",
    baseURL: UNISWAP_API_BASE,
    headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
    },
});
const buildClients = (fields) => {
    if (!fields.privateKey)
        throw new Error("Uniswap: a private key is required to sign transactions.");
    const chain = CHAIN_MAP[fields.chain];
    if (!chain)
        throw new Error(`Uniswap: unsupported chain id '${fields.chain}'.`);
    const transport = fields.rpcUrl ? (0, viem_1.http)(fields.rpcUrl) : (0, viem_1.http)();
    const account = (0, accounts_1.privateKeyToAccount)(fields.privateKey);
    return {
        wallet: (0, viem_1.createWalletClient)({ account, chain, transport }),
        public: (0, viem_1.createPublicClient)({ chain, transport }),
        chainId: chain.id,
    };
};
class Node extends node_sdk_1.RuntimeNode {
    clients;
    tradeApi;
    constructor(nodeId, context) {
        super(nodeId, context);
        const { privateKey, apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.uniswapApi.blob);
        this.clients = buildClients({ ...this.fieldValues, privateKey });
        this.tradeApi = createTradeApiClient(this.httpClientFactory, apiKey);
    }
    async onRun(incoming) {
        const { wallet, public: publicClient, chainId } = this.clients;
        const address = wallet.account.address;
        const checkApproval = (0, tools_1.tool)(async ({ token, amount }) => {
            const data = await this.tradeApi.post("/check_approval", {
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
                to: approval.to,
                value: (0, viem_1.fromHex)(approval.value, "bigint"),
                data: approval.data,
                chain: wallet.chain,
                account: wallet.account,
            });
            await publicClient.waitForTransactionReceipt({ hash: txHash });
            return JSON.stringify({ status: "approved", txHash });
        }, {
            name: "uniswap_check_approval",
            description: "Check if the wallet has enough approval for a token and submit the approval transaction if needed. Must be called before swapping.",
            schema: v3_1.z.object({
                token: v3_1.z.string().describe("Token contract address to approve (e.g. 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 for USDC on mainnet)."),
                amount: v3_1.z.string().describe("Amount to approve in base units (wei / smallest denomination)."),
            }),
        });
        const getQuote = (0, tools_1.tool)(async ({ tokenIn, tokenOut, amount, type }) => {
            const quote = await this.tradeApi.post("/quote", {
                tokenInChainId: chainId,
                tokenOutChainId: chainId,
                tokenIn,
                tokenOut,
                amount,
                type: type ?? "EXACT_INPUT",
                swapper: address,
            });
            return JSON.stringify(quote);
        }, {
            name: "uniswap_get_quote",
            description: "Get a swap quote from Uniswap. Returns the expected output amount, price impact, and gas estimate. Does not execute a trade.",
            schema: v3_1.z.object({
                tokenIn: v3_1.z.string().describe("Input token contract address."),
                tokenOut: v3_1.z.string().describe("Output token contract address."),
                amount: v3_1.z.string().describe("Amount in base units (wei). For EXACT_INPUT this is the input amount; for EXACT_OUTPUT it is the desired output amount."),
                type: v3_1.z.enum(["EXACT_INPUT", "EXACT_OUTPUT"]).optional().describe("Swap type. Defaults to EXACT_INPUT."),
            }),
        });
        const swapTokens = (0, tools_1.tool)(async ({ tokenIn, tokenOut, amount, type }) => {
            // Step 1: get quote + permit data
            const quoteResponse = await this.tradeApi.post("/quote", {
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
            let signature;
            if (permitData) {
                signature = await wallet.signTypedData({
                    account: wallet.account,
                    domain: permitData.domain,
                    types: permitData.types,
                    primaryType: "PermitSingle",
                    message: permitData.values,
                });
            }
            // Step 3: submit swap
            const swapResponse = await this.tradeApi.post("/swap", {
                signature,
                quote,
                permitData: permitData ?? undefined,
            });
            const swap = swapResponse.swap;
            const txHash = await wallet.sendTransaction({
                to: swap.to,
                value: (0, viem_1.fromHex)(swap.value, "bigint"),
                data: swap.data,
                chain: wallet.chain,
                account: wallet.account,
            });
            await publicClient.waitForTransactionReceipt({ hash: txHash });
            return JSON.stringify({ status: "swapped", txHash });
        }, {
            name: "uniswap_swap_tokens",
            description: "Swap tokens on Uniswap. Make sure to call uniswap_check_approval for the input token before calling this. Handles permit signing and transaction submission automatically.",
            schema: v3_1.z.object({
                tokenIn: v3_1.z.string().describe("Input token contract address."),
                tokenOut: v3_1.z.string().describe("Output token contract address."),
                amount: v3_1.z.string().describe("Amount in base units (wei). For EXACT_INPUT this is the input amount; for EXACT_OUTPUT it is the desired output amount."),
                type: v3_1.z.enum(["EXACT_INPUT", "EXACT_OUTPUT"]).optional().describe("Swap type. Defaults to EXACT_INPUT."),
            }),
        });
        return { tools: [checkApproval, getQuote, swapTokens] };
    }
}
exports.Node = Node;
