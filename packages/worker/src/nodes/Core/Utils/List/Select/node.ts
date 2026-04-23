import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { strategy, index } = this.fields;
        const { list } = inputs;

        if (!Array.isArray(list) || list.length === 0) {
            return { element: undefined };
        }

        let picked: unknown;
        switch (strategy) {
            case "first":
                picked = list[0];
                break;
            case "last":
                picked = list[list.length - 1];
                break;
            case "at_index": {
                const i = index < 0 ? list.length + index : index;
                picked = list[i];
                break;
            }
        }

        return { element: picked };
    }
}
