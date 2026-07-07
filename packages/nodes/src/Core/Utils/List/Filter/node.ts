import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<Blueprint>,
    ): Promise<InferOutputs<Blueprint>> {

        const { list } = incoming;

        if (!Array.isArray(list))
            return { filtered: [], discarded: [] };

        // `condition` is item-scoped: evaluated once per element with $item bound to that element.
        const keep = this.evalItemField("condition", list, { coerceTo: "boolean" });

        const filtered: unknown[] = [];
        const discarded: unknown[] = [];
        list.forEach((item, i) => (keep[i] ? filtered : discarded).push(item));

        return { filtered, discarded };
    }
}
 