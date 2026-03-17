import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;



    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { stringField } = this.fields;
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


}
