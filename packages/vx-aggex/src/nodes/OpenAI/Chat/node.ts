import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/types";
import { ChatOpenAI } from "@langchain/openai";
import { Runtime } from "src/runtime";
import { Synthesizer } from "src/synthesizer";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        config: Runtime.InferConfig<typeof Blueprint>,
        inputs: Runtime.InferInputs<typeof Blueprint>
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const { model, api_key, temperature, maxTokens, topP, frequencyPenalty, presencePenalty } = config;
        const { input, systemMessage } = inputs;

        const llm = new ChatOpenAI({
            model,
            apiKey: api_key,
            maxTokens,
            temperature,
            topP,
            frequencyPenalty,
            presencePenalty,
        });

        const response = await llm.invoke([
            Synthesizer.coerceMessage("system", systemMessage),
            Synthesizer.coerceMessage("human", input)
        ]);

        return { response };
    }


    public override async onReconcile(
        changedConfigId: Foundations.NodeConfig.Id,
        newValue: Foundations.NodeConfig.Value,
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Promise.resolve(currentBlueprint);
    }


    public override async onConversion(
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Blueprint
    }
}
