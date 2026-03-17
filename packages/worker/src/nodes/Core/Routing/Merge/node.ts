import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { strategy } = this.fields;
        // const { a, b } = inputs;

        // // TODO: Implement merge strategies
        // let output;
        // switch (strategy) {
        //     case "first":
        //         output = a ?? b;
        //         break;
        //     case "last":
        //         output = b ?? a;
        //         break;
        //     case "all":
        //         output = a ?? b;
        //         break;
        //     default:
        //         output = a ?? b;
        // }

        const output = {};

        return { output: inputs.input_1 ?? inputs.input_2 };
    }
}
