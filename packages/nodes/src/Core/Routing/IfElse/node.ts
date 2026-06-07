import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferInputs, InferOutputs, OneOf } from "@pretzel-graph/node-sdk";
import { Expression, Foundations } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override PROPAGATION_STRATEGY = "router" as const

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<OneOf<InferOutputs<typeof Blueprint>>> {

        const { condition } = this.fields;

        const expressionCtx = Expression.createContext(
            this.workflowNode,
            this.fields,
            inputs,
            Expression.resolveWorkflowConfig(this.context.workflowData),
        )

        const result = Foundations.Field.Condition.evaluate(condition, expressionCtx);

        if (result)
            return { true: inputs.input }
        else
            return { false: inputs.input }
    }
}
