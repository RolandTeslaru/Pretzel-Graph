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
        const response = await inputs.languageModel.invoke([
            inputs.systemMessage,
            inputs.input
        ], {
            signal: context.abortController.signal
        })
        return { response }
    }
}
