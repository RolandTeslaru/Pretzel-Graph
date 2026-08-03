import { RegisterNode, RuntimeNode, InferFieldValues, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Workflow } from "@pretzel-graph/shared/domain";
import { ChatOpenRouter } from "@langchain/openrouter";

function selectedModel(fields: InferFieldValues<typeof Blueprint>): string {
    switch (fields.provider) {
        case "Anthropic": return fields.anthropicModel;
        case "Google":    return fields.googleModel;
        case "OpenAI":    return fields.openAIModel;
        case "Meta":      return fields.metaModel;
        case "DeepSeek":  return fields.deepSeekModel;
        case "Mistral":   return fields.mistralModel;
        case "Cohere":    return fields.cohereModel;
        case "xAI":       return fields.xaiModel;
    }
}

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatOpenRouter;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);

        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.openRouterApi.blob);
        const fields = this.fieldValues;

        this.llm = new ChatOpenRouter({
            model: selectedModel(fields),
            temperature: fields.temperature,
            ...(typeof fields.maxTokens === "number" ? { maxTokens: fields.maxTokens } : {}),
            topP: fields.topP,
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
