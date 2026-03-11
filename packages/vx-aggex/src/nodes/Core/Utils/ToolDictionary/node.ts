import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { RuntimeNode, RuntimeState } from "src/runtime";
import { InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    

    public override async run(
        state: RuntimeState,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        // Implement ToolDictionary node logic here
        return {};
    }
}
