import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint"
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { Runtime } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        fields: InferFields<typeof Blueprint>,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { input } = inputs;

        // input is already a BaseMessage (from upstream edge or synthesized from field value)
        return { response: input };
    }
}