import { RuntimeNode, InferFieldValues, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Workflow } from "@pretzel-graph/shared/domain";
import { ChatOpenAI } from "@langchain/openai";
import { EFFORT_LEVELS, REASONING_EFFORTS, type ModelId, type ReasoningEffort } from "./models";

function selectedModel(fields: InferFieldValues<typeof Blueprint>): ModelId {
    switch (fields.provider) {
        case "Anthropic": return fields.anthropicModel;
        case "Google":    return fields.googleModel;
        case "OpenAI":    return fields.openAIModel;
        case "Meta":      return fields.metaModel;
        case "DeepSeek":  return fields.deepSeekModel;
        case "Alibaba":   return fields.alibabaModel;
        case "Moonshot":  return fields.moonshotModel;
        case "ZAI":       return fields.zaiModel;
        case "Mistral":   return fields.mistralModel;
        case "Cohere":    return fields.cohereModel;
        case "xAI":       return fields.xaiModel;
    }
}

// Closest effort the model accepts, preferring more reasoning on a tie; undefined when it takes none.
function supportedEffort(model: ModelId, requested: ReasoningEffort): ReasoningEffort | undefined {
    const accepted = REASONING_EFFORTS[model];

    if (!accepted)
        return undefined;

    const target = EFFORT_LEVELS.indexOf(requested);
    const distance = (effort: ReasoningEffort) => Math.abs(EFFORT_LEVELS.indexOf(effort) - target);

    return accepted.reduce((best, effort) => distance(effort) <= distance(best) ? effort : best);
}

export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatOpenAI;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.Context) {
        super(nodeId, context);

        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.vercelAIGatewayApi.blob);
        const fields = this.fieldValues;

        const model = selectedModel(fields);
        const effort = supportedEffort(model, fields.reasoningEffort);

        this.llm = new ChatOpenAI({
            model,
            ...(effort ? { reasoning: { effort } } : {}),
            ...(typeof fields.maxTokens === "number" ? { maxTokens: fields.maxTokens } : {}),
            apiKey,
            configuration: { baseURL: "https://ai-gateway.vercel.sh/v1" },
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
