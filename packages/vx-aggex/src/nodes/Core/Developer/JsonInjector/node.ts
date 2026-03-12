import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { data } = this.fields;

        return {
            output: data
        };
    }


}
