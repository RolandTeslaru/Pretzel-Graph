import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { LC } from "@pretzel-graph/node-sdk";

export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;



    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        
        // Slots are derived from the count field, so the incoming shape is only known at run time.
        const slots = incoming as Record<string, LC.Tool[] | undefined>;

        const toolList: LC.Tool[] = Object.values(slots).flatMap(value => value ?? []);

        return {
            tool_list: toolList,
        };
    }
}
