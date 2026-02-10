import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint"
import { Foundations, Workflow } from "@vx-agent-editor/shared/types";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { Runtime } from "src/runtime";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        incomingValues: Runtime.InferInputs<typeof Blueprint>
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const { text } = incomingValues;

        return { response: text }
    }


    public override async onReconcile(
        changedInputId: Foundations.Input.Id,
        newValue: any,
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Promise.resolve(currentBlueprint);
    }
}