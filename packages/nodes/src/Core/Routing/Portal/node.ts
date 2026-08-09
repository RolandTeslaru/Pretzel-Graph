import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Workflow } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public injectedData: unknown = undefined;

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ) {

        const fields = this.fieldValues;

        if(fields.direction === "in") {
            const resolvedIncoming = this.incomingFor(fields, incoming);
            
            const outNodes = this.context
                .workflowQueryAPI
                .getNodesByBlueprint<typeof Blueprint>(Blueprint.id)
                .filter(({ fields: candidateFields, node }) => (candidateFields["portalId"] === fields.portalId) && (candidateFields["direction"] === "out") && (node.id !== this.nodeId));
    
            for (const { node } of outNodes) {
                const instance = this.context.instanceRegistryAPI.get(node.id);
                if (!(instance instanceof Node)) continue;
    
                instance.injectedData = resolvedIncoming.input;
                this.context.schedulerAPI.fireNode(node.id as Workflow.Node.Id);
            }

            return {} satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {
            output: this.injectedData,
        } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }
}
