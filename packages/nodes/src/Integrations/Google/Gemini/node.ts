import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Workflow } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    private readonly llm: ChatGoogleGenerativeAI;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
        this.llm = new ChatGoogleGenerativeAI(this.fields);
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        return {
            languageModel: this.llm
        };
    }
}
