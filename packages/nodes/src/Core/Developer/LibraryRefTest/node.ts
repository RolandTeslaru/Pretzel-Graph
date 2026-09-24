import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { workflowOnly, skillOnly, folderOnly, anyConnection, discordConnection, anyKind } = this.fieldValues;

        return {
            refs: { workflowOnly, skillOnly, folderOnly, anyConnection, discordConnection, anyKind },
        };
    }
}
