import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/types";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { Runtime } from "src/runtime";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        incomingValues: Runtime.InferInputs<typeof Blueprint>
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const { model, prompt, api_key, temperature, maxTokens, topP, frequencyPenalty, presencePenalty } = incomingValues;

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
            new HumanMessage(prompt)
        ]);

        return { response: response }
    }


    public override async onReconcile(
        changedInputId: Foundations.Input.Id,
        newValue: any,
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Promise.resolve(currentBlueprint);
    }
}
