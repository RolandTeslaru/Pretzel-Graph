import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Synthesizer } from "src/synthesizer";
import { RuntimeNode, RuntimeState } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";
import { BaseMessageChunk } from "@langchain/core/messages";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatGoogleGenerativeAI

    constructor(props: RuntimeNode.ConstructorProps) {
        super(props);
        this.llm = new ChatGoogleGenerativeAI(this.fields);
    }

    public override async run(
        state: RuntimeState,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { systemMessage, input } = inputs;

        const response = await this.llm.invoke([
            systemMessage,
            input
        ]);

        console.log("Gemini response ", JSON.stringify(response, null, 2));

        return {
            response,
            languageModel: this.llm
        };
    }
}