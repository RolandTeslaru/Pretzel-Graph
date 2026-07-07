import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { strategy, index } = this.fieldValues;
        const { list } = incoming;

        if (!Array.isArray(list) || list.length === 0) {
            return { element: undefined };
        }

        let picked: unknown;
        switch (strategy) {
            case "first":
                picked = list[0];
                break;
            case "last":
                picked = list[list.length - 1];
                break;
            case "at_index": {
                const i = index < 0 ? list.length + index : index;
                picked = list[i];
                break;
            }
        }

        return { element: picked };
    }
}
