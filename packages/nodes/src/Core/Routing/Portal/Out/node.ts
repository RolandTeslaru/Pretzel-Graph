import { RegisterNode, RuntimeFloatingNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeFloatingNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    public injectedData: unknown = undefined;

    protected override async onRun(
        _inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        return { output: this.injectedData }
    }
}
