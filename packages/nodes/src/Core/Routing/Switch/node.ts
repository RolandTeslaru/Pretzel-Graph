import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode, RuntimeRouterNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs, OneOf } from "@pretzel-graph/node-sdk";
import { Expression, Foundations } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeRouterNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> { // we dont really know what routes will be generated, so we return partial outputs

        const { cases } = this.fields;
        const { input } = inputs;

        const expressionCtx: Expression.Context = {
            thisNode: this.workflowNode,
            thisNodeValues: this.fields,
            incoming: inputs
        }

        for (const { condition, portId } of cases) {
            const result = Foundations.Field.Condition.evaluate(condition, expressionCtx);
            
            if (result)
                return { [portId]: input } as OneOf<InferOutputs<typeof Blueprint>>;
        }
        
        return {}
    }
}
