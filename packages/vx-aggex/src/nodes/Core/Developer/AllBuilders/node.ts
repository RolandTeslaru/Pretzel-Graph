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

        const { stringField } = fields;
        const {
            messageInput,
            languageModelInput,
            documentInput,
            retrieverInput,
            embeddingsInput,
            vectorStoreInput,
            toolInput
        } = inputs;

        return {
            messageOutput: messageInput,
            textOutput: stringField,
            languageModelOutput: languageModelInput,
            documentOutput: documentInput,
            retrieverOutput: retrieverInput,
            embeddingsOutput: embeddingsInput,
            vectorStoreOutput: vectorStoreInput,
            toolOutput: toolInput,
            dataFrameOutput: { data: "frame" }
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
