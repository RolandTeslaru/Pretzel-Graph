import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Airlock } from "@pretzel-graph/shared/domain";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { buildTools } from "./tools";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ) {
        const fields = this.fieldValues;

        if (fields.isConvertedToTool === true)
            return {
                tool: buildTools({
                    airlockAPI: this.context.airlockAPI,
                    nodeId:     this.nodeId,
                    incoming,
                })[0],
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        try {
            const result = await this.context.airlockAPI.executeAsyncCode(
                Airlock.Source.asCode(fields.code),
                this.nodeId,
                incoming,
            );

            return { output: result } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        } catch (err) {
            // OOM disposed the shared isolate — must terminate, never swallow.
            if (err instanceof Error && err.name === Airlock.TERMINATION_ERROR_NAME)
                throw err;
            return {
                output: { error: err instanceof Error ? err.message : String(err) },
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }
    }
}
