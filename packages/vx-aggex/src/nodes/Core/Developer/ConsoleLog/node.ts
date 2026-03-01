import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { RuntimeNode, RuntimeState } from "src/runtime";
import { InferFields, InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(props: RuntimeNode.ConstructorProps) {
        super(props);
    }

    public override async run(
        state: RuntimeState,
        fields: InferFields<typeof Blueprint>,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { level, prefix } = fields;
        const { message } = inputs;

        const logMethod = (console[level as keyof Console] as Function) || console.log;

        if (prefix) {
            logMethod(`[${prefix}]`, message);
        } else {
            logMethod(message);
        }

        return {
            output: message
        };
    }


}
