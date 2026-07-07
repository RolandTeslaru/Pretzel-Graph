import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Airlock } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

// NOT INCLUDED IN PRODUCTION BUILD - FOR DEV PURPOSES ONLY. This node allows executing arbitrary JavaScript code, and is intended for testing and development only. It should not be used in production environments.

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { code } = this.fieldValues;

        try {
            // Sandboxed (isolated-vm) async code: @in is passed as the fn param, so re-fires
            // can't clobber it. Code `return`s its result explicitly (code mode).
            const result = await this.context
                .airlockAPI
                .executeAsyncCode(Airlock.Source.asCode(code), this.workflowNode.id, incoming);

            return {
                output: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            };
        } catch (err) {
            // An OOM disposed the shared isolate — must terminate, never swallow.
            if (err instanceof Error && err.name === Airlock.TERMINATION_ERROR_NAME)
                throw err;
            return {
                output: `Error evaluating script: ${err instanceof Error ? err.message : String(err)}`
            };
        }
    }

}
