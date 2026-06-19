import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferInputs, InferOutputs, OneOf } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override PROPAGATION_STRATEGY = "router" as const

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<OneOf<InferOutputs<typeof Blueprint>>> {

        // condition is pre-evaluated by evaluateFields() — a plain boolean here.
        // Legacy nodes that still hold a condition-tree object coerce to the default (true).
        const result = !!this.fields.condition;

        return result
            ? { true: inputs.input }
            : { false: inputs.input };
    }
}
