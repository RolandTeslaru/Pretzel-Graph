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
        const { error } = this.fields;

        throw new Error(error || "Intentional error");
    }
}
