import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
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
        fields: Runtime.InferFields<typeof Blueprint>,
        inputs: Runtime.InferInputs<typeof Blueprint>
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const { model, api_key, temperature, maxTokens, topP, frequencyPenalty, presencePenalty } = fields;
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
        changedFieldId: Foundations.Field.Id,
        newValue: Foundations.Field.Value,
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
