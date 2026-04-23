import { RegisterNode } from "@vx-agent-editor/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@vx-agent-editor/node-sdk";
import { InferInputs, InferOutputs } from "@vx-agent-editor/node-sdk";

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
