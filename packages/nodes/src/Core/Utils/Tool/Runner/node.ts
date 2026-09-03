import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { LC } from "@pretzel-graph/node-sdk";

type ToolCall = NonNullable<LC.AIMessage["tool_calls"]>[number];

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { tools, deniedTools, input } = incoming;

        const aiMessage = input as any as LC.AIMessage;

        // The assistant turn must stay in the conversation history immediately
        // before its tool results — otherwise providers (e.g. Gemini) see tool
        // responses with no matching tool call and return MALFORMED_RESPONSE.
        // So we always emit the received AIMessage as the first element.
        if (!aiMessage.tool_calls?.length)
            return { toolOutputs: [aiMessage] };

        const toolsMap = new Map(tools.map((tool) => [tool.name, tool]));

        const deniedNames = new Set((deniedTools ?? []).map((tool) => tool.name));

        const toolMessages = await Promise.all(
            aiMessage.tool_calls.map((call) => this.runOne(call, toolsMap, deniedNames)),
        );

        return {
            toolOutputs: [aiMessage, ...toolMessages],
        };
    }




    // Every call gets exactly one ToolMessage, whatever happens to it.
    private async runOne(call: ToolCall, toolsMap: Map<string, LC.Tool>, deniedNames: Set<string>): Promise<LC.ToolMessage> {
        if (deniedNames.has(call.name))
            return this.refuse(call, `The call to ${call.name} was denied by the user. Do not retry it; continue without it, or ask the user.`);

        const tool = toolsMap.get(call.name);

        if (!tool)
            return this.refuse(call, `Could not find tool with name ${call.name}`);

        try {
            const result = await tool.invoke(call, { signal: this.context.abortAPI.signal });

            return result as LC.ToolMessage;
        }
        catch (error) {
            console.error("Error occurred while invoking tool:", error);

            const message = error instanceof Error ? error.message : String(error);

            return this.refuse(call, `Error occurred while invoking tool ${call.name}: ${message}`);
        }
    }




    private refuse(call: ToolCall, content: string): LC.ToolMessage {
        return new LC.ToolMessage({
            content,
            tool_call_id: call.id ?? crypto.randomUUID(),
            name:         call.name,
            status:       "error",
        });
    }
}
