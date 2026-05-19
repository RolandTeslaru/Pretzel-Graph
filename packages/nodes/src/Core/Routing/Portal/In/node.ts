import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Blueprint as PortalOutBlueprint } from "../Out/blueprint";
import { Node as PortalOutNode } from "../Out/node";
import { Workflow } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const outNodes = this.context.workflowQueryAPI
            .getNodesByBlueprint<typeof PortalOutBlueprint>(PortalOutBlueprint.id)
            .filter(({ fields }) => fields["portalId"] === this.fields.portalId);

        for (const { node } of outNodes) {
            const instance = this.context.instanceRegistryAPI.get(node.id);
            if (!(instance instanceof PortalOutNode)) continue;

            instance.injectedData = inputs.input;
            this.context.schedulerAPI.fireNode(node.id as Workflow.Node.Id);
        }

        return {};
    }
}
