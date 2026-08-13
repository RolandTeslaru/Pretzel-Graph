import { RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { start, end } = this.fieldValues;
        const { list } = incoming;

        if (!Array.isArray(list)) {
            return { slice: [] };
        }

        const result = end === undefined ? list.slice(start) : list.slice(start, end);

        return { slice: result };
    }
}
