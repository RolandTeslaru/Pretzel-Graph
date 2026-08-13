import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFieldValues, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { duration } = this.fieldValues;
        const { trigger } = incoming;

        await this.AbortablePromise((resolve, reject, signal) => {
            const timer = setTimeout(resolve, duration);
            signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
        });

        return {
            done: trigger
        };
    }

}
