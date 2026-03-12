import { RegisterNode } from "../../../services/Catalogue/service";
import { Blueprint } from "./blueprint"
import { ExecutionContext } from "src/context";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const lastMessage = context.session.messages[context.session.messages.length - 1];

        return { response: lastMessage };
    }
}