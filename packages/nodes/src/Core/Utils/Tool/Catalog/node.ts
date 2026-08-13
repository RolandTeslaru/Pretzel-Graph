import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { LC } from "@pretzel-graph/node-sdk";

export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;



    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        
        const toolList: LC.Tool[] = [];

        Object.entries(incoming).filter(([_, value]) => !!value).forEach(([key, value]) => {
            toolList.push(...value);
        });

        return {
            tool_list: toolList,
        };
    }
}
