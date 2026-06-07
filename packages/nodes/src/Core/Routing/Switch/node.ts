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
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> { // we dont really know what routes will be generated, so we return partial outputs

        const { cases } = this.fields;
        const { input } = inputs;

        const expressionCtx = Expression.createContext(
            this.workflowNode,
            this.fields,
            inputs,
            Expression.resolveWorkflowConfig(this.context.workflowData),
        )

        for (const { condition, portId } of cases) {
            const result = Foundations.Field.Condition.evaluate(condition, expressionCtx);
            
            if (result)
                return { [portId]: input } as OneOf<InferOutputs<typeof Blueprint>>;
        }
        
        return {}
    }
}
