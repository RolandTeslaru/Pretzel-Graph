import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Synthesizer } from "src/synthesizer";
import { RuntimeNode, RuntimeState } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";
import { BaseMessageChunk } from "@langchain/core/messages";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private llm: ChatGoogleGenerativeAI

    constructor(props: RuntimeNode.ConstructorProps) {
        super(props);
        this.llm = new ChatGoogleGenerativeAI(this.fields);
    }

    public override async run(
        state: RuntimeState,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { systemMessage, input } = inputs;

        const stream = await this.llm.stream([
            Synthesizer.coerceMessage("system", systemMessage),
            Synthesizer.coerceMessage("human", input),
        ]);

        state.streamController.registerStream(this.workflowNode.id, stream)

        let finalResponse: BaseMessageChunk | null = null;

        // for await (const chunk of stream) {
        //     if (!finalResponse) {
        //         finalResponse = chunk;
        //     } else {
        //         finalResponse = finalResponse.concat(chunk);
        //     }
        // }

        console.log("Gemini response ", JSON.stringify(finalResponse, null, 2));

        return {
            response: finalResponse as any,
            stream,
            languageModel: this.llm
        };
    }
}