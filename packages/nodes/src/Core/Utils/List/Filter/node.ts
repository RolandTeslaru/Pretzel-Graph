import { RegisterNode, RuntimeNode, InferInputs, InferOutputs, mapFieldValues } from "@pretzel-graph/node-sdk";
import { Airlock } from "@pretzel-graph/shared/domain";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<Blueprint>,
    ): Promise<InferOutputs<Blueprint>> {

        const { list } = inputs;

        if (!Array.isArray(list)) {
            return { filtered: [] };
        }

        // The engine pre-evaluates expression fields once per firing with @in bound to the
        // whole list — not useful here, since "condition" must run once per item with @in
        // bound to that item. So the raw (unevaluated) source is read directly and evaluated
        // per element instead of relying on this.fields.condition.
        const rawCondition = mapFieldValues<Blueprint>(this.workflowNode.id, this.context.workflowData).condition as unknown;
        const conditionField = this.workflowNode.fields.find(field => field.id === "condition");
        const isExpression = !!conditionField && "isExpression" in conditionField && conditionField.isExpression === true;

        if (!isExpression) {
            return { filtered: rawCondition ? list : [] };
        }

        const filtered = list.filter(item =>
            !!this.context.airlockAPI.executeSync(
                {
                    [Airlock.GLOBALS.in]: item,
                    [Airlock.GLOBALS.nodeId]: this.workflowNode.id,
                },
                evaluate => evaluate(Airlock.Source.asExpression(rawCondition as string), "boolean"),
            )
        );

        return { filtered };
    }
}
