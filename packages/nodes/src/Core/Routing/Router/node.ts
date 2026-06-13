import { RegisterNode, RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Airlock, Foundations } from "@pretzel-graph/shared/domain";

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

        // Set `@in` once; evaluate every case synchronously inside the block.
        this.context
            .airlockAPI
            .executeSync(
                { 
                    [Airlock.GLOBALS.in]: inputs, 
                    [Airlock.GLOBALS.nodeId]: this.workflowNode.id 
                },
                (evaluate) => {
                    const resolve = this.operandResolver(evaluate);
                    for (const { condition, portId } of cases) {
                        if (Foundations.Field.Condition.evaluate(condition, resolve))
                            (result as Record<string, unknown>)[portId] = input;
                    }
                },
            );

        return result;
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
