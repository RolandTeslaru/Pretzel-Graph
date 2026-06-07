import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const outputId = this.workflowNode.id as unknown as Port.Output.Id;

        if (!this.context.enclosingNodeAPI)
            throw new Error("No enclosing node API available. This node can only be used within a subworkflow.");

        this.context.enclosingNodeAPI.writePort(outputId, inputs.input);
        this.context.enclosingNodeAPI.emitPort(outputId);

        return {};
    }
}
