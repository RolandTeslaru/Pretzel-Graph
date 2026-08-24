import { RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Workflow } from "@pretzel-graph/shared/domain";
import { ChatXAI } from "@langchain/xai";

export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatXAI;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);

        const { model, temperature, maxTokens } = this.fieldValues;

        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.xAiApi.blob);

        this.llm = new ChatXAI({
            model,
            temperature,
            ...(typeof maxTokens === "number" ? { maxTokens } : {}),
            apiKey,
        });
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {
        return {
            languageModel: this.llm
        };
    }
}
