import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Workflow } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public override readonly IS_PASSIVE = true

    public readonly Blueprint = Blueprint;

    public injectedData: unknown = undefined;

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        if(this.fieldValues.direction === "in") {
            
            const outNodes = this.context
                .workflowQueryAPI
                .getNodesByBlueprint<typeof Blueprint>(Blueprint.id)
                .filter(({ fields, node }) => (fields["portalId"] === this.fieldValues.portalId) && (fields["direction"] === "out") && (node.id !== this.workflowNode.id));
    
            for (const { node } of outNodes) {
                const instance = this.context.instanceRegistryAPI.get(node.id);
                if (!(instance instanceof Node)) continue;
    
                instance.injectedData = incoming.input;
                this.context.schedulerAPI.fireNode(node.id as Workflow.Node.Id);
            }

            return {}
        }
        else {
            return { output: this.injectedData }
        }
    }
}
