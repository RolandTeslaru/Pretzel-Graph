import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { append, overwrite } = inputs;

        const previousState: unknown[] =
            this.context.session.node_output_instances[this.workflowNode.id]?.state ?? [];

        const incoming = Array.isArray(append) ? append.flat() : append != null ? [append] : [];

        let newState = [...previousState, ...incoming];

        if (overwrite !== undefined) {
            if (Array.isArray(overwrite)) {
                newState = [... overwrite]
            } else {
                newState = overwrite != null ? [overwrite] : [];
            }
        }

        return {
            state: newState,
            prevState: previousState,
        };
    }
}
