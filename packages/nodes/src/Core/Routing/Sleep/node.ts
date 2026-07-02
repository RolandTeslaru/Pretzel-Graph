import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFieldValues, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;



    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { duration } = this.fieldValues;
        const { trigger } = inputs;

        await this.AbortablePromise((resolve, reject, signal) => {
            const timer = setTimeout(resolve, duration);
            signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
        });

        return {
            done: trigger
        };
    }


}
