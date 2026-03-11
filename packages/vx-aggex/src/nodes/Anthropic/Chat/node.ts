import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ChatAnthropic } from "@langchain/anthropic";
import { Synthesizer } from "src/synthesizer";
import { RuntimeNode, RuntimeState, RuntimeContext } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatAnthropic;

    constructor(workflowNode: Workflow.Node, context: RuntimeContext) {
        super(workflowNode, context);
        this.llm = new ChatAnthropic(this.fields);
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
