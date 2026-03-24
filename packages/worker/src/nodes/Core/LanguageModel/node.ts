import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferFields, InferInputs, InferOutputs } from "src/types";

type Inputs = InferInputs<typeof Blueprint>
type Outputs = InferOutputs<typeof Blueprint>

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
        inputs: Inputs
    ): Promise<Outputs> {

        const isStreaming = this.fields.stream;

        if (isStreaming) {
            const stream = await inputs.languageModel.stream([
                inputs.systemMessage,
                inputs.input
            ], {
                signal: context.abortController.signal,
            });

            let response: any = null;

            for await (const chunk of stream) {
                if (typeof chunk.content === "string") {
                    context.streamController.yieldLlmChunk(this.workflowNode.id, chunk.content);
                }

                if (!response) {
                    response = chunk;
                } else {
                    response = response.concat(chunk);
                }
            }

            return { response };
        } else {
            const response = await inputs.languageModel.invoke([
                inputs.systemMessage,
                inputs.input
            ], {
                signal: context.abortController.signal,
            });
            return { response };
        }
    }
}
