import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFieldValues, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;



    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
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
        } = incoming;

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
            unresolvedOutput:      incoming.unresolvedInput,
            unresolvedScalarOutput: incoming.unresolvedScalarInput,
            unresolvedListOutput:  incoming.unresolvedListInput,
            toolListOutput:        incoming.toolListInput,
            messageListOutput:     incoming.messageListInput,
            dataOutput:            incoming.dataInput,
            dataListOutput:        incoming.dataListInput,
        };
    }


}
