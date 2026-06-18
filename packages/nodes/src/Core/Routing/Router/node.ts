import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override PROPAGATION_STRATEGY = "router" as const

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        const { cases } = this.fields;
        const { input } = inputs;

        const result: Partial<InferOutputs<typeof Blueprint>> = {};

        // cases are pre-evaluated by evaluateFields() — value is always a plain boolean here.
        for (const { value, portId } of cases) {
            if (value)
                (result as Record<string, unknown>)[portId] = input;
        }

        return result;
    }
}
