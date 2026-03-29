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
        const { input } = inputs;

        const previousState: unknown[] =
            this.context.session.node_output_instances[this.workflowNode.id]?.state ?? [];

        const incoming = Array.isArray(input) ? input.flat() : input != null ? [input] : [];

        const accumulated = [...previousState, ...incoming];

        return {
            output: accumulated,
            state: accumulated,
        };
    }
}
