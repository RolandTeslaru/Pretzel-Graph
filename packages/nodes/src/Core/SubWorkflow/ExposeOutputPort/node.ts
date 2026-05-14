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
        console.log(`[ExposeOutputPort:onRun] nodeId=${this.workflowNode.id} outputId=${outputId} hasParentBridgeHooks=${!!this.context.parentBridgeHooks} input=${JSON.stringify(inputs.input)?.slice(0, 100)}`);

        this.context.parentBridgeHooks?.writeToOutputPort(outputId, inputs.input);
        this.context.parentBridgeHooks?.propagateFromOutputPort(outputId);

        console.log(`[ExposeOutputPort:onRun] wrote and propagated outputId=${outputId}`);
        return {};
    }
}
