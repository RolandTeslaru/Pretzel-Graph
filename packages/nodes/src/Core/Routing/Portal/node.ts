import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Workflow } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public override readonly IS_PASSIVE = true

    public readonly Blueprint = Blueprint;

    public injectedData: unknown = undefined;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        if(this.fields.direction === "in") {
            
            const outNodes = this.context
                .workflowQueryAPI
                .getNodesByBlueprint<typeof Blueprint>(Blueprint.id)
                .filter(({ fields }) => fields["portalId"] === this.fields.portalId);
    
            for (const { node } of outNodes) {
                const instance = this.context.instanceRegistryAPI.get(node.id);
                if (!(instance instanceof Node)) continue;
    
                instance.injectedData = inputs.input;
                this.context.schedulerAPI.fireNode(node.id as Workflow.Node.Id);
            }

            return {}
        }
        else {
            return { output: this.injectedData }
        }
    }
}
