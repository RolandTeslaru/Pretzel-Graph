import { RegisterNode } from "@vx-agent-editor/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@vx-agent-editor/node-sdk";
import { InferInputs, InferOutputs } from "@vx-agent-editor/node-sdk";

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

        const newState = [...previousState, ...incoming];

        return {
            state: newState,
            prevState: previousState,
        };
    }
}
