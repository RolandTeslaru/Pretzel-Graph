import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ChatOpenAI } from "@langchain/openai";
import { RuntimeNode, RuntimeState, RuntimeContext } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";
import { Synthesizer } from "src/synthesizer";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatOpenAI;

    constructor(workflowNode: Workflow.Node, context: RuntimeContext) {
        super(workflowNode, context);
        this.llm = new ChatOpenAI(this.fields);
    }

    public override async run(
        state: RuntimeState,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {
        return { 
            languageModel: this.llm 
        };
    }





    public override async onConversion(
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Blueprint
    }
}
