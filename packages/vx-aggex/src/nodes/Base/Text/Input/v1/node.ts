import { RegisterNode } from "src/services/Catalogue/service";
import { Definition } from "./definition";
import { Foundations, Workflow } from "@vx-agent-editor/shared/types";
import { Runtime } from "src/runtime";

@RegisterNode(Definition.id)
export class Node extends Runtime.Node<typeof Definition> {

    public readonly Definition = Definition;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state:          Runtime.State,
        incomingValues: Runtime.InferInputs<typeof Definition>
    ): Promise<Runtime.InferOutputs<typeof Definition>> {

        const { text } = incomingValues;

        return { output: text }
    }


    public override async onReconcile(
        changedInputId: Foundations.Input.Id,
        newValue: any,
        currentDefinition: typeof Definition
    ): Promise<typeof Definition> {
        return Promise.resolve(currentDefinition);
    }
}