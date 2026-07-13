import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { append, overwrite } = incoming;

        const previousState: unknown[] =
            this.context.session.node_output_instances[this.nodeId]?.state ?? [];

        const appendItems = Array.isArray(append) ? append.flat() : append != null ? [append] : [];

        let newState = [...previousState, ...appendItems];

        if (overwrite !== undefined) {
            if (Array.isArray(overwrite)) {
                newState = [... overwrite]
            } else {
                newState = overwrite != null ? [overwrite] : [];
            }
        }

        return {
            state: newState,
            prevState: previousState,
        };
    }
}
