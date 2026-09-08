import { RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Workflow } from "@pretzel-graph/shared/domain";
import { ChatOpenAI } from "@langchain/openai";

export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatOpenAI;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);

        const { model, maxTokens, reasoningEffort } = this.fieldValues;

        const { apiKey, organizationId } = this.context.credentialsAPI.getDecryptedValue(this.credentials.openAiApi.blob);

        // Chat Completions rejects function tools alongside reasoning, so anything above "none" goes through Responses.
        this.llm = new ChatOpenAI({
            model,
            reasoning: { effort: reasoningEffort },
            useResponsesApi: reasoningEffort !== "none",
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
