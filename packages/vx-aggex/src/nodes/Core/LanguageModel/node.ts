import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { Runtime } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        fields: InferFields<typeof Blueprint>,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const {
            provider,
            modelName,
            apiKey,
            systemMessage,
            stream,
            temperature
        } = fields;

        const { inputValue } = inputs;

        // NOTE: This implementation is a placeholder skeleton as requested.
        // It destructures the inputs and fields but does not implement the actual LLM logic.
        // To fully implement, we would need to map each provider to its LangChain JS equivalent
        // (ChatOpenAI, ChatAnthropic, ChatOllama, etc.) and handle the conditional instantiation.

        // For now, we just log what we received.
        console.log("LanguageModel Node Run:", {
            provider,
            modelName,
            inputValue: inputValue ? "Received" : "Empty"
        });

        // Returning empty/any for now since logic is not implemented
        return {
            languageModel: {} as any,
            response: {} as any
        };
    }


}
