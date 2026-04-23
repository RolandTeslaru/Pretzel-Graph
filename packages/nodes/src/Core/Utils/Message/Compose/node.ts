import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { role } = this.fields;
        const { data } = inputs;

        const content = typeof data === "string"
            ? data
            : JSON.stringify(data, null, 2);

        switch (role) {
            case "Human":
                return { message: new HumanMessage(content) };
            case "System":
                return { message: new SystemMessage(content) };
            case "Tool": {
                const toolCallId = (this.fields as any).toolCallId as string;
                if (!toolCallId) {
                    throw new Error("Tool Call ID is required for Tool messages");
                }
                return { message: new ToolMessage({ content, tool_call_id: toolCallId }) };
            }
            default:
                throw new Error(`Unknown message role: ${role}`);
        }
    }
}
