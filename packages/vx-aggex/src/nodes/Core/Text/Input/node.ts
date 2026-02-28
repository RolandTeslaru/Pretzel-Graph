import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { Runtime } from "src/runtime";
import { HumanMessage } from "@langchain/core/messages";
import { InferInputs, InferOutputs } from "src/types";

@RegisterNode(Blueprint.id)
export class Node extends Runtime.Node<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    constructor(props: Runtime.Node.ConstructorProps) {
        super(props);
    }

    public override async run(
        state: Runtime.State,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { text } = inputs;

        return {
            output: new HumanMessage(text)
        };
    }


}