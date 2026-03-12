import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ChatAnthropic } from "@langchain/anthropic";
import { Synthesizer } from "src/synthesizer";
import { RuntimeNode } from "src/node";
import { ExecutionContext } from "src/context";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatAnthropic;

    constructor(workflowNode: Workflow.Node, context: ExecutionContext) {
        super(workflowNode, context);
        this.llm = new ChatAnthropic(this.fields);
    }

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        return {
            languageModel: this.llm
        };
    }

}
