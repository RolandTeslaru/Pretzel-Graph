import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ExecutionContext } from "src/context";
import { RuntimeRouterNode } from "src/node";
import { Synthesizer } from "src/synthesizer";
import { InferInputs, InferOutputs, OneOf } from "src/types";
import { Expression, Foundations } from "@vx-agent-editor/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeRouterNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<OneOf<InferOutputs<typeof Blueprint>>> {

        const { condition } = this.fields;

        // Project LC instances into plain objects whose shape matches
        // property-access paths, so expressions like `$input.tool_calls.length`
        // resolve against the same shape the user sees in the frontend inspector.
        const projectedInputs: Record<string, any> = {};
        for (const port of this.workflowNode.inputs)
            projectedInputs[port.id] = Synthesizer.project(inputs[port.id], port.variant);

        const result = Foundations.Field.Condition.evaluate(condition, projectedInputs);

        if (result)
            return { true: inputs.input }
        else
            return { false: inputs.input }
    }
}
