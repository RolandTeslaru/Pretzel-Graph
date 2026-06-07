import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Expression, Foundations } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override PROPAGATION_STRATEGY = "router" as const

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
            Expression.resolveWorkflowConfig(this.context.workflowData),
        )

        for (const { condition, portId } of cases) {
            if (Foundations.Field.Condition.evaluate(condition, expressionCtx))
                (result as Record<string, unknown>)[portId] = input;
        }

        return result;
    }
}
