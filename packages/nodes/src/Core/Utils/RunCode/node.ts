import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Airlock } from "@pretzel-graph/shared/domain";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { code } = this.fieldValues;

        try {
            const result = await this.context.airlockAPI.executeAsyncCode(
                Airlock.Source.asCode(code),
                this.workflowNode.id,
                incoming,
            );

            return { output: result };
        } catch (err) {
            // OOM disposed the shared isolate — must terminate, never swallow.
            if (err instanceof Error && err.name === Airlock.TERMINATION_ERROR_NAME)
                throw err;
            return { output: { error: err instanceof Error ? err.message : String(err) } };
        }
    }
}
