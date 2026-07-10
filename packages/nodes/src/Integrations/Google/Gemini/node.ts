import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Workflow } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatGoogleGenerativeAI;

    constructor(workflowNode: Workflow.Node.Raw, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);

        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.googleGeminiApi.blob);

        const thinkingBudget = this.fieldValues.thinkingBudget;
        const maxOutputTokens = this.fieldValues.maxOutputTokens;

        this.llm = new ChatGoogleGenerativeAI({
            model: this.fieldValues.model,
            temperature: this.fieldValues.temperature,
            ...(typeof maxOutputTokens === "number" ? { maxOutputTokens } : {}),
            topP: this.fieldValues.topP,
            topK: this.fieldValues.topK,
            // Omit thinkingConfig for legacy nodes saved before this field existed
            // (thinkingBudget === undefined) so the model keeps its default behavior.
            ...(typeof thinkingBudget === "number" ? { thinkingConfig: { thinkingBudget } } : {}),
            apiKey
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
