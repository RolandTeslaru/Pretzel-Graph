import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferInputs, InferOutputs, OneOf } from "@pretzel-graph/node-sdk";
import { Airlock, Foundations } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override PROPAGATION_STRATEGY = "router" as const

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<OneOf<InferOutputs<typeof Blueprint>>> {

        const { condition } = this.fields;

        const result = this.context
            .airlockAPI
            .executeSync(
                { 
                    [Airlock.GLOBALS.in]: inputs, 
                    [Airlock.GLOBALS.nodeId]: this.workflowNode.id 
                },
                (evaluate) => Foundations.Field.Condition.evaluate(condition, this.operandResolver(evaluate)),
            );

        if (result)
            return { true: inputs.input }
        else
            return { false: inputs.input }
    }

    /**
     * Resolver for condition operands, run inside `executeSync` (so `@in` is set):
     * literals pass through; `isExpression` operands run through the airlock. The combinator
     * does its own per-dataType coercion, so we resolve without baked coercion.
     */
    private operandResolver(evaluate: Airlock.EvaluateFn): Foundations.Field.Condition.OperandResolver {
        return (operand, isExpression) => {
            if (!isExpression) return operand;
            if (operand.trim() === "") return undefined;
            return evaluate(Airlock.Source.asExpression(operand));
        };
    }
}
