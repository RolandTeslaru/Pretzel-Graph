import { RegisterNode } from "src/services/Catalogue/service";
import { Definition } from "./definition";
import { Foundations, Workflow } from "@vx-agent-editor/shared/types";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { Runtime } from "src/runtime";

@RegisterNode(Definition.id)
export class Node extends Runtime.Node<typeof Definition> {

    public readonly Definition = Definition;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        incomingValues: Runtime.InferInputs<typeof Definition>
    ): Promise<Runtime.InferOutputs<typeof Definition>> {

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
        currentDefinition: typeof Definition
    ): Promise<typeof Definition> {
        return Promise.resolve(currentDefinition);
    }
}
