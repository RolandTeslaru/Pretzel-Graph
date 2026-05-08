import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {
    public readonly Blueprint = Blueprint;

    protected override async onRun(
        _inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        throw new Error("Core.SubWorkflow.Execute nodes must be inlined by the compiler before runtime");
    }
}
