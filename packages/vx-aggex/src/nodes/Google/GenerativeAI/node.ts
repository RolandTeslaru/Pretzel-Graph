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
        inputs: Runtime.InferInputs<typeof Blueprint>,
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const { systemMessage, input, model, api_key, temperature, maxOutputTokens, topP, topK } = inputs;

        const llm = new ChatGoogleGenerativeAI({
            model,
            apiKey: api_key,
            maxOutputTokens,
            temperature,
            topP,
            topK,
        });

        const response = await llm.invoke([
            Synthesizer.ensureMessage("system", systemMessage),
            Synthesizer.ensureMessage("human", input),
        ]);

        return { 
            response,
            languageModel: llm
         };
    }


    public override async onReconcile(
        changedInputId: Foundations.Input.Id,
        newValue: any,
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Promise.resolve(currentBlueprint);
    }
}