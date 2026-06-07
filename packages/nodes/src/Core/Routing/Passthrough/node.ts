import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override PROPAGATION_STRATEGY = "router" as const

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(inputs)) {
            const index = key.replace("input_", "");
            // never emit undefined (means "still waiting"), but allow null (means "exposed but nothing injected")
            result[`output_${index}`] = value ?? null;
        }

        return result as InferOutputs<typeof Blueprint>;
    }
}
