import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferIncoming, InferOutputs, OneOf } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override readonly PROPAGATION_STRATEGY = RuntimeNode.PropagationStrategy.ROUTER

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<OneOf<InferOutputs<typeof Blueprint>>> {

        // condition is pre-evaluated by evaluateFieldValues() — a plain boolean here.
        // Legacy nodes that still hold a condition-tree object coerce to the default (true).
        const result = !!this.fieldValues.condition;

        return result
            ? { true: incoming.input }
            : { false: incoming.input };
    }
}
