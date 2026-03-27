import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { ordering } = this.fields;

        const output: unknown[] = [];

        for (const portId of ordering) {
            const value = inputs[portId as keyof typeof inputs];
            if (value == null) continue;
            if (Array.isArray(value)) {
                output.push(...value);
            } else {
                output.push(value);
            }
        }

        return { output };
    }
}
