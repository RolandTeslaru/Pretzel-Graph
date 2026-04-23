import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { RuntimeRouterNode } from "src/node";
import { InferInputs, InferOutputs, OneOf } from "src/types";
import { Expression, Foundations } from "@vx-agent-editor/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeRouterNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<OneOf<InferOutputs<typeof Blueprint>>> {

        const { condition } = this.fields;

        const expressionCtx: Expression.Context = {
            thisNode: this.workflowNode,
            thisNodeValues: this.fields,
            incoming: inputs
        }

        const result = Foundations.Field.Condition.evaluate(condition, expressionCtx);

        if (result)
            return { true: inputs.input }
        else
            return { false: inputs.input }
    }
}
