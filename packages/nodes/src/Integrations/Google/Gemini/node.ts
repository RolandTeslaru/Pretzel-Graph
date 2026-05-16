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

        const { apiKey } = this.context.getDecryptedCredentialValues(this.credentials.googleGeminiApi.blob);

        this.llm = new ChatGoogleGenerativeAI({
            model: this.fields.model,
            temperature: this.fields.temperature,
            maxOutputTokens: this.fields.maxOutputTokens,
            topP: this.fields.topP,
            topK: this.fields.topK,
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
