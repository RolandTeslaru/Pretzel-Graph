import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFieldValues, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { level, prefix } = this.fieldValues;
        const { message } = incoming;

        const logMethod = (console[level as keyof Console] as Function) || console.log;

        if (prefix) {
            logMethod(`[${prefix}]`, message);
        } else {
            logMethod(message);
        }

        return {
            output: message
        };
    }

}
