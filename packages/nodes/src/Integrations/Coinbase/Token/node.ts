import {
    AgentKit,
    CdpEvmWalletProvider,
    erc20ActionProvider,
    type EvmWalletProvider,
} from "@coinbase/agentkit";
import { tool } from "@langchain/core/tools";

import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { Blueprint, ToolBlueprint } from "./blueprint";

type AgentKitAction = Awaited<ReturnType<AgentKit["getActions"]>>[number];

/** Convert a single AgentKit action into a LangChain tool */
const toLangChainTool = (action: AgentKitAction) =>
    tool(
        async (args) => {
            const result = await action.invoke(args);
            return typeof result === "string" ? result : JSON.stringify(result);
        },
        {
            name: action.name,
            description: action.description,
            schema: action.schema as any,
        },
    );


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    public readonly Blueprint = Blueprint;

    private walletProvider!: EvmWalletProvider;
    private agentkit!: AgentKit;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
    }

    protected override async onCompile() {
        const { cdpKeyId, cdpKeySecret, walletSecret } = this.context.credentialsAPI.getDecryptedValue(this.credentials.coinbaseApi.blob);
        const { networkId, walletAddress } = this.fields;

        if (!cdpKeyId || !cdpKeySecret || !walletSecret)
            throw new Error("ERC-20 Token: CDP Key ID, CDP Key Secret, and Wallet Secret are all required.");

        this.walletProvider = await CdpEvmWalletProvider.configureWithWallet({
            apiKeyId: cdpKeyId,
            apiKeySecret: cdpKeySecret,
            walletSecret,
            networkId,
            ...(walletAddress ? { address: walletAddress as `0x${string}` } : {}),
        });

        this.agentkit = await AgentKit.from({
            walletProvider: this.walletProvider,
            actionProviders: [erc20ActionProvider()],
        });
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const actions = this.agentkit.getActions();
        const getBalanceAction = actions.find(a => a.name === "get_balance");

        if (!getBalanceAction)
            throw new Error("ERC-20 Token: get_balance action not available on this network.");

        const address = inputs.targetAddress?.trim() || this.walletProvider.getAddress();
        const tokenAddress = inputs.tokenAddress?.trim() || undefined;

        const result = await getBalanceAction.invoke({
            ...(tokenAddress ? { tokenAddress } : {}),
            address,
        });

        const parsed = typeof result === "string" ? result : JSON.stringify(result);
        // Try to extract a numeric balance from the response string
        const match = parsed.match(/[\d.]+/);
        const balance = match ? parseFloat(match[0]) : null;

        return { balance, data: typeof result === "object" ? result : { raw: result } };
    }

    protected override async onBuildTool(
        inputs: InferInputs<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        const actions = this.agentkit.getActions();
        const find = (name: string) => {
            const action = actions.find(a => a.name === name);
            if (!action) throw new Error(`ERC-20 Token: action '${name}' not available on network '${this.fields.networkId}'.`);
            return toLangChainTool(action);
        };

        return {
            getBalance: find("get_balance"),
            transfer: find("transfer"),
            approve: find("approve"),
            getAllowance: find("get_allowance"),
            getTokenAddress: find("get_erc20_token_address"),
        };
    }
}
