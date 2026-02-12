import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/types";
import { Runtime } from "src/runtime";
import { HumanMessage } from "@langchain/core/messages";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Runtime.State,
        config: Runtime.InferConfig<typeof Blueprint>,
        inputs: Runtime.InferInputs<typeof Blueprint>
    ): Promise<Runtime.InferOutputs<typeof Blueprint>> {

        const { text } = config;

        return { 
            output: new HumanMessage(text)
         };
    }


    public override async onReconcile(
        changedConfigId: Foundations.NodeConfig.Id,
        newValue: Foundations.NodeConfig.Value,
        currentBlueprint: typeof Blueprint
    ): Promise<typeof Blueprint> {
        return Promise.resolve(currentBlueprint);
    }
}