import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    public ejectedData: any

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        this.ejectedData = inputs.input

        return {};
    }
}