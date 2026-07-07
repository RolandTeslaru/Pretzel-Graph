import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { LC } from "@pretzel-graph/node-sdk";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { tools, input } = incoming;

        const aiMessage = input as any as LC.AIMessage;

        // The assistant turn must stay in the conversation history immediately
        // before its tool results — otherwise providers (e.g. Gemini) see tool
        // responses with no matching tool call and return MALFORMED_RESPONSE.
        // So we always emit the received AIMessage as the first element.
        if (!aiMessage.tool_calls?.length)
            return { toolOutputs: [aiMessage] }

        const toolsMap = new Map(tools.map(tool => [tool.name, tool]));

        const toolMessages = await Promise.all(
            aiMessage.tool_calls.map(async (call) => {
                const tool = toolsMap.get(call.name);

                if (tool) {
                    try {
                        const result = await tool.invoke(
                            call, 
                            {
                                signal: this.context.abortAPI.signal,
                            }) as LC.ToolMessage;
                        return result;
                    } catch (error) {
                        console.error("Error occurred while invoking tool:", error);
                        
                        return new LC.ToolMessage({
                            content: `Error occurred while invoking tool ${call.name}: ${error instanceof Error ? error.message : String(error)}`,
                            tool_call_id: call.id ?? crypto.randomUUID(),
                            name: call.name,
                            status: "error",
                        });
                    }
                } else {
                    return new LC.ToolMessage({
                        content: "Could not find tool with name " + call.name,
                        tool_call_id: call.id ?? crypto.randomUUID(),
                        name: call.name,
                        status: "error"
                    });
                }
            })
        );

        return {
            toolOutputs: [aiMessage, ...toolMessages],
        };
    }
}
