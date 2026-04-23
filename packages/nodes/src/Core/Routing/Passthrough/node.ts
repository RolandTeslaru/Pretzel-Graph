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

        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(inputs)) {
            const index = key.replace("input_", "");
            result[`output_${index}`] = value;
        }

        return result as InferOutputs<typeof Blueprint>;
    }
}
