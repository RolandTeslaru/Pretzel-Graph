import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "src/node";
import { ExecutionContext } from "src/context";
import { InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { overwrite, append } = inputs;

        context.updateSession(d => {
            if (overwrite !== undefined) {
                d.messages = [...overwrite];
            }
            if (append !== undefined) {
                d.messages = [...d.messages, ...append];
            }
        });

        return {
            history: context.session.messages,
        };
    }
}
