import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(incoming)) {
            const index = key.replace("input_", "");
            // never emit undefined (means "still waiting"), but allow null (means "exposed but nothing injected")
            result[`output_${index}`] = value ?? null;
        }

        return result as InferOutputs<typeof Blueprint>;
    }
}
