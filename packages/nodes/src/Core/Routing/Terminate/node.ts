import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    // `message` is reconciled in for the `error` mode, so it isn't on the inferred field type.
    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { mode } = this.fieldValues;

        if (mode === "error") {
            const message = (this.fieldValues as Record<string, unknown>).message as string;
            throw new Error(message?.trim() || "Workflow terminated.");
        }

        // stop → end the whole run cleanly (engine resolves with status "terminated").
        this.context.abortAPI.abort("Workflow terminated by Terminate node.");

        return {} as InferOutputs<typeof Blueprint>;
    }
}
