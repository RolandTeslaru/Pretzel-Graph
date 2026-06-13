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
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> { // we dont really know what routes will be generated, so we return partial outputs

        const { cases } = this.fields;
        const { input } = inputs;

        return this.context
            .airlockAPI
            .executeSync(
                { [Airlock.GLOBALS.in]: inputs, [Airlock.GLOBALS.nodeId]: this.workflowNode.id },
                (evaluate) => {
                    const resolve = this.operandResolver(evaluate);
                    for (const { condition, portId } of cases) {
                        if (Foundations.Field.Condition.evaluate(condition, resolve))
                            return { [portId]: input } as OneOf<InferOutputs<typeof Blueprint>>;
                    }
                    return {} as OneOf<InferOutputs<typeof Blueprint>>;
                },
            );
    }

    /** Resolve operands (literals pass through; isExpression → airlock). */
    private operandResolver(evaluate: Airlock.EvaluateFn): Foundations.Field.Condition.OperandResolver {
        return (operand, isExpression) => {
            if (!isExpression) return operand;
            if (operand.trim() === "") return undefined;
            return evaluate(Airlock.Source.asExpression(operand));
        };
    }
}
