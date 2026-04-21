import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ExecutionContext } from "src/context";
import { RuntimeRouterNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";
import { Expression, Foundations } from "@vx-agent-editor/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeRouterNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        const { cases } = this.fields;
        const { input } = inputs;

        const result: Partial<InferOutputs<typeof Blueprint>> = {};

        const expressionCtx: Expression.Context = {
            thisNode: this.workflowNode,
            thisNodeValues: this.fields,
            incoming: inputs
        }

        for (const { condition, portId } of cases) {
            if (Foundations.Field.Condition.evaluate(condition, expressionCtx))
                (result as Record<string, unknown>)[portId] = input;
        }

        return result;
    }
}
