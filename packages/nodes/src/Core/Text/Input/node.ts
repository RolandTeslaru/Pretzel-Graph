import { RegisterNode, RuntimeNode, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { HumanMessage } from "@langchain/core/messages";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<InferOutputs<typeof Blueprint>> {

        const { text } = this.fieldValues;

        return {
            output: new HumanMessage(text)
        };
    }

}