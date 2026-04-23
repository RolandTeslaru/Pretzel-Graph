import { RegisterNode } from "../../../../services/Catalogue/service";
import { Blueprint } from "./blueprint"
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";
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