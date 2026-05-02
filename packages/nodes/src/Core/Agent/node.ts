import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint"
import { RuntimeNode, LC } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { languageModel, input, systemMessage } = inputs;

        const messages: LC.BaseMessage[] = [];
        if (systemMessage) messages.push(systemMessage);
        messages.push(input);

        const response = await languageModel.invoke(messages);

        return { response };
    }
}
