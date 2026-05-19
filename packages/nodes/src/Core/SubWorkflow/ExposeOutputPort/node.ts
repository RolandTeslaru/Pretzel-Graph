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
        console.log(`[ExposeOutputPort:onRun] nodeId=${this.workflowNode.id} outputId=${outputId} hasParentPortAPI=${!!this.context.parentPortAPI} input=${JSON.stringify(inputs.input)?.slice(0, 100)}`);

        if (!this.context.parentPortAPI) 
            throw new Error("No parent port API available. This node can only be used within a subworkflow.");

        this.context.parentPortAPI.write(outputId, inputs.input);
        this.context.parentPortAPI.propagate(outputId);

        console.log(`[ExposeOutputPort:onRun] wrote and propagated outputId=${outputId}`);
        return {};
    }
}
