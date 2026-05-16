import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Workflow } from "@pretzel-graph/shared/domain";
import { ChatOpenRouter } from "@langchain/openrouter";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatOpenRouter;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
        this.llm = new ChatOpenRouter(this.fields as any);
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {
        return {
            languageModel: this.llm
        };
    }
}
