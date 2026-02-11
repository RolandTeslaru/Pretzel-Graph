import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/types";
import { ChatOpenAI } from "@langchain/openai";
import { Runtime } from "src/runtime";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        inputs: Runtime.InferInputs<typeof Blueprint>
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const { model, input, systemMessage, api_key, temperature, maxTokens, topP, frequencyPenalty, presencePenalty } = inputs;

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
            systemMessage,  // already a BaseMessage
            input           // already a BaseMessage
        ]);

        return { response };
    }


    public override async onReconcile(
        changedInputId: Foundations.Input.Id,
        newValue: any,
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Promise.resolve(currentBlueprint);
    }
}
