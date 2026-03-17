import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;



    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { duration } = this.fields;
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
