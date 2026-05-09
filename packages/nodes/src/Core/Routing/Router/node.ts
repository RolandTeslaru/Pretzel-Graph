import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeRouterNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Expression, Foundations } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeRouterNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {

        const { cases } = this.fields;
        const { input } = inputs;

        const result: Partial<InferOutputs<typeof Blueprint>> = {};

        const expressionCtx = Expression.createContext(
            this.workflowNode,
            this.fields,
            inputs,
            Expression.resolveWorkflowConfig(this.context.workflowData.fields ?? {}),
        )

        for (const { condition, portId } of cases) {
            if (Foundations.Field.Condition.evaluate(condition, expressionCtx))
                (result as Record<string, unknown>)[portId] = input;
        }

        return result;
    }
}
