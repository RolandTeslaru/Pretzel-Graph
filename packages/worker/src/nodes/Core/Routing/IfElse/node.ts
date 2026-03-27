import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ExecutionContext } from "src/context";
import { RuntimeRouterNode } from "src/node";
import { InferInputs, InferOutputs, OneOf } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeRouterNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<OneOf<InferOutputs<typeof Blueprint>>> {

        const { condition } = this.fields;
        const { input } = inputs;

        // TODO: Implement condition evaluation logic
        const result = Boolean(condition);

        if (result)
            return { true: input }
        else
            return { false: input }
    }
}
