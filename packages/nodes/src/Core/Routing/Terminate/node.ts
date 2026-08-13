import { RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ) {

        const fields = this.fieldValues;

        if (fields.mode === "error")
            throw new Error(fields.message.trim() || "Workflow terminated.");

        // stop → end the whole run cleanly (engine resolves with status "terminated").
        this.context.abortAPI.abort("Workflow terminated by Terminate node.");

        return {} satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }
}
