import { RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Workflow } from "@pretzel-graph/shared/domain";
import { ChatOpenAI } from "@langchain/openai";

export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatOpenAI;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);

        const { model, maxTokens } = this.fieldValues;

        const { apiKey, organizationId } = this.context.credentialsAPI.getDecryptedValue(this.credentials.openAiApi.blob);

        this.llm = new ChatOpenAI({
            model,
            ...(typeof maxTokens === "number" ? { maxTokens } : {}),
            apiKey,
            ...(organizationId ? { configuration: { organization: organizationId } } : {}),
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
