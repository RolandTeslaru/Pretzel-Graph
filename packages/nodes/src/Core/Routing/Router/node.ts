import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override readonly PROPAGATION_STRATEGY = RuntimeNode.PropagationStrategy.ROUTER

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        const { cases } = this.fieldValues;
        const { input } = incoming;

        const result: Partial<InferOutputs<typeof Blueprint>> = {};

        // cases are pre-evaluated by evaluateFieldValues() — value is always a plain boolean here.
        for (const { value, portId } of cases) {
            if (value)
                (result as Record<string, unknown>)[portId] = input;
        }

        return result;
    }
}
