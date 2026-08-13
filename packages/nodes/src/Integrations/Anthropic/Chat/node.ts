import { RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Workflow } from "@pretzel-graph/shared/domain";
import { ChatAnthropic } from "@langchain/anthropic";

export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatAnthropic;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);

        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.anthropicApi.blob);

        this.llm = new ChatAnthropic({
            model: this.fieldValues.model,
            ...(typeof this.fieldValues.maxTokens === "number" ? { maxTokens: this.fieldValues.maxTokens } : {}),
            apiKey,
        });
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        return {
            languageModel: this.llm
        };
    }
}
