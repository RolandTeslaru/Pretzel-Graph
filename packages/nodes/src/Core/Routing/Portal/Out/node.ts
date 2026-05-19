import { RegisterNode, RuntimeFloatingNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeFloatingNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    // Data and signal are pushed by Portal.In via portAPI — this node never actually executes.
    protected override async onRun(
        _inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        // @ts-expect-error
        return {};
    }
}
