import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Synthesizer } from "src/synthesizer";
import { RuntimeNode, RuntimeState, RuntimeContext } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";
import { Workflow } from "@vx-agent-editor/shared/domain";
import { BaseMessageChunk } from "@langchain/core/messages";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatGoogleGenerativeAI

    constructor(workflowNode: Workflow.Node, context: RuntimeContext) {
        super(workflowNode, context);
        this.llm = new ChatGoogleGenerativeAI(this.fields);
    }

    public override async run(
        state: RuntimeState,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        return {
            languageModel: this.llm
        };
    }
}