import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Workflow } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatGoogleGenerativeAI;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);

        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.googleGeminiApi.blob);

        const thinkingBudget = this.fields.thinkingBudget;

        this.llm = new ChatGoogleGenerativeAI({
            model: this.fields.model,
            temperature: this.fields.temperature,
            maxOutputTokens: this.fields.maxOutputTokens,
            topP: this.fields.topP,
            topK: this.fields.topK,
            // Omit thinkingConfig for legacy nodes saved before this field existed
            // (thinkingBudget === undefined) so the model keeps its default behavior.
            ...(typeof thinkingBudget === "number" ? { thinkingConfig: { thinkingBudget } } : {}),
            apiKey
        });
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        return {
            languageModel: this.llm
        };
    }
}
