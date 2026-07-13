import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public override readonly CATCHES_ERROR = true;

    // Normal (non-error) path only: return `passthrough`, so the default routing
    // signals that branch and never the `onError` branch.
    // The error path is engine-driven via `CATCHES_ERROR` (writes `onError`,
    // emits only that branch, swallows the envelope) and does not call onRun.
    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        return { passthrough: incoming.input }
    
    }
}
