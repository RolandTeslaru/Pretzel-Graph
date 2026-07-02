import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFieldValues, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;



    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { stringField } = this.fieldValues;
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
            messageOutput:         messageInput,
            textOutput:            stringField,
            languageModelOutput:   languageModelInput,
            documentOutput:        documentInput,
            retrieverOutput:       retrieverInput,
            embeddingsOutput:      embeddingsInput,
            vectorStoreOutput:     vectorStoreInput,
            toolOutput:            toolInput,
            dataFrameOutput:       { data: "frame" },
            unresolvedOutput:      inputs.unresolvedInput,
            unresolvedScalarOutput: inputs.unresolvedScalarInput,
            unresolvedListOutput:  inputs.unresolvedListInput,
            toolListOutput:        inputs.toolListInput,
            messageListOutput:     inputs.messageListInput,
            dataOutput:            inputs.dataInput,
            dataListOutput:        inputs.dataListInput,
        };
    }


}
