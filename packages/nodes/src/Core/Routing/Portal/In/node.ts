import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { mapFieldValues } from "@pretzel-graph/node-sdk/src/utils/mapFieldValues";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { Workflow } from "@pretzel-graph/shared/domain";
import { Blueprint as PortOutBlueprint } from "../Out/blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const myPortalId = this.fields.portalId;

        const outNodes = Object.values(this.context.workflowData.nodes).filter(n => {
            if (n.blueprintId !== "Core.Routing.Portal.Out") 
                return false;

            const fields = mapFieldValues<typeof PortOutBlueprint>(n.id, this.context.workflowData);

            return fields["portalId"] === myPortalId;
        });

        for (const outNode of outNodes) {
            this.context.portAPI.write(
                outNode.id,
                "output" as Port.Output.Id,
                inputs.input,
            );
            this.context.portAPI.propagate(
                outNode.id,
                "output" as Port.Output.Id,
            );
        }

        return {};
    }
}
