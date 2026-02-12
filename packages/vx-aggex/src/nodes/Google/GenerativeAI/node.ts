import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/types";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Synthesizer } from "src/synthesizer";
import { Runtime } from "src/runtime";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state:  Runtime.State,
        config: Runtime.InferConfig<typeof Blueprint>,
        inputs: Runtime.InferInputs<typeof Blueprint>,
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const { model, api_key, temperature, maxOutputTokens, topP, topK } = config;
        const { systemMessage, input } = inputs;

        const llm = new ChatGoogleGenerativeAI({
            model,
            apiKey: api_key,
            maxOutputTokens,
            temperature,
            topP,
            topK,
        });

        const response = await llm.invoke([
            Synthesizer.coerceMessage("system", systemMessage),
            Synthesizer.coerceMessage("human", input),
        ]);

        return { 
            response,
            languageModel: llm
         };
    }


    public override async onReconcile(
        changedConfigId: Foundations.NodeConfig.Id,
        newValue: Foundations.NodeConfig.Value,
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Promise.resolve(currentBlueprint);
    }
}