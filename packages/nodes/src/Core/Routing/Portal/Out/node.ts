import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public override readonly IS_PASSIVE = true

    public readonly Blueprint = Blueprint;

    public injectedData: unknown = undefined;

    protected override async onRun(
        _inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        return { output: this.injectedData }
    }
}
