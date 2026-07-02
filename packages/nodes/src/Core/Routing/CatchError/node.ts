import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    // Normal (non-error) path only: forward `input` to `passthrough`. "router" so we
    // signal only the passthrough branch, never the `onError` branch.
    // The error path is engine-driven via `flags.catchesError` (writes `onError`,
    // emits only that branch, swallows the envelope) and does not call onRun.
    protected override PROPAGATION_STRATEGY = "router" as const

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        return { passthrough: incoming.input } as Partial<InferOutputs<typeof Blueprint>>;
    }
}
