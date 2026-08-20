"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
const node_sdk_2 = require("../../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { tools, input } = incoming;
        const aiMessage = input;
        // The assistant turn must stay in the conversation history immediately
        // before its tool results — otherwise providers (e.g. Gemini) see tool
        // responses with no matching tool call and return MALFORMED_RESPONSE.
        // So we always emit the received AIMessage as the first element.
        if (!aiMessage.tool_calls?.length)
            return { toolOutputs: [aiMessage] };
        const toolsMap = new Map(tools.map(tool => [tool.name, tool]));
        const toolMessages = await Promise.all(aiMessage.tool_calls.map(async (call) => {
            const tool = toolsMap.get(call.name);
            if (tool) {
                try {
                    const result = await tool.invoke(call, {
                        signal: this.context.abortAPI.signal,
                    });
                    return result;
                }
                catch (error) {
                    console.error("Error occurred while invoking tool:", error);
                    return new node_sdk_2.LC.ToolMessage({
                        content: `Error occurred while invoking tool ${call.name}: ${error instanceof Error ? error.message : String(error)}`,
                        tool_call_id: call.id ?? crypto.randomUUID(),
                        name: call.name,
                        status: "error",
                    });
                }
            }
            else {
                return new node_sdk_2.LC.ToolMessage({
                    content: "Could not find tool with name " + call.name,
                    tool_call_id: call.id ?? crypto.randomUUID(),
                    name: call.name,
                    status: "error"
                });
            }
        }));
        return {
            toolOutputs: [aiMessage, ...toolMessages],
        };
    }
}
exports.Node = Node;
