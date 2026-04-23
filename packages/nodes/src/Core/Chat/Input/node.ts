import { RegisterNode } from "@vx-agent-editor/node-sdk"
import { Blueprint } from "./blueprint"
import { RuntimeNode } from "@vx-agent-editor/node-sdk";
import { InferInputs, InferOutputs } from "@vx-agent-editor/node-sdk";
import { HumanMessage } from "@langchain/core/messages";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const lastMessage = this.context.session.messages[this.context.session.messages.length - 1];

        if (!lastMessage) {
            return { response: new HumanMessage("") }
        }

        return { response: lastMessage };
    }
}