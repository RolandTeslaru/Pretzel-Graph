import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "src/node";
import { InferFields, InferInputs, InferOutputs } from "src/types";
import { LC } from "src/langchain";

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
