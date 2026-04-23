import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFields, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { LC } from "@pretzel-graph/node-sdk";

type Inputs = InferInputs<typeof Blueprint>
type Outputs = InferOutputs<typeof Blueprint>

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: Inputs
    ): Promise<Outputs> {

        const isStreaming = this.fields.stream;

        const { systemMessage } = inputs;

        const languageModel = inputs.tools?.length && inputs.languageModel.bindTools
            ? inputs.languageModel.bindTools(inputs.tools)
            : inputs.languageModel;

        const messages = [systemMessage, ...inputs.messages].filter(Boolean);
        const response = await languageModel.invoke(messages, {
            signal: this.context.abortSignal,
        });
        return { response };
    }
}
