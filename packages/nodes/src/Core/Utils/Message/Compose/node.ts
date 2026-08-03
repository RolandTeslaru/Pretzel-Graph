import {
    InferIncoming,
    InferOutputs,
    RegisterNode,
    RuntimeNode,
} from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const fields = this.fieldValues;

        switch (fields.role) {
            case "Human":
                return { message: new HumanMessage(fields.content) };

            case "System":
                return { message: new SystemMessage(fields.content) };

            case "Tool": {
                if (!fields.toolCallId)
                    throw new Error("Tool Call ID is required for Tool messages");

                return {
                    message: new ToolMessage({
                        content:      fields.content,
                        tool_call_id: fields.toolCallId,
                    }),
                };
            }
        }
    }
}
