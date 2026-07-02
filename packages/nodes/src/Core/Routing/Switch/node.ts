import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferIncoming, InferOutputs, OneOf } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override PROPAGATION_STRATEGY = "router" as const

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> { // we dont really know what routes will be generated, so we return partial outputs

        const { cases } = this.fieldValues;
        const { input } = incoming;

        // cases are pre-evaluated by evaluateFields() — value is always a plain boolean here.
        for (const { value, portId } of cases) {
            if (value)
                return { [portId]: input } as OneOf<InferOutputs<typeof Blueprint>>;
        }
        return {} as OneOf<InferOutputs<typeof Blueprint>>;
    }
}
