import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { overwrite, append } = inputs;

        this.context.updateSession(d => {
            if (overwrite !== undefined) {
                d.messages = [...overwrite];
            }
            if (append !== undefined) {
                d.messages = [...d.messages, ...append];
            }
        });

        return {
            history: this.context.session.messages,
        };
    }
}
