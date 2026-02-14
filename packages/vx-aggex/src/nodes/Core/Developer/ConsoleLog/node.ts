import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/types";
import { Runtime } from "src/runtime";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        fields: Runtime.InferFields<typeof Blueprint>,
        inputs: Runtime.InferInputs<typeof Blueprint>,
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const { level, prefix } = fields;
        const { message } = inputs;

        const logMethod = (console[level as keyof Console] as Function) || console.log;

        if (prefix) {
            logMethod(`[${prefix}]`, message);
        } else {
            logMethod(message);
        }

        return {
            output: message
        };
    }

    public override async onReconcile(
        changedFieldId: Foundations.Field.Id,
        newValue: Foundations.Field.Value,
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Promise.resolve(currentBlueprint);
    }
}
