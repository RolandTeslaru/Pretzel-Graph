import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { start, end } = this.fieldValues;
        const { list } = inputs;

        if (!Array.isArray(list)) {
            return { slice: [] };
        }

        const result = end === undefined ? list.slice(start) : list.slice(start, end);

        return { slice: result };
    }
}
