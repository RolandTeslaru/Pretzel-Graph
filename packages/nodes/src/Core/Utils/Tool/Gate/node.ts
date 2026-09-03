import { Blueprint } from "./blueprint";
import { RuntimeNode, InferIncoming, LC } from "@pretzel-graph/node-sdk";

type ToolCall = NonNullable<LC.AIMessage["tool_calls"]>[number];

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ) {
        const fields = this.fieldValues;

        const message = incoming.input;

        // Nothing to gate: not an assistant turn, or one that called no tools.
        if (message.type !== "ai" || !(message as LC.AIMessage).tool_calls?.length)
            return { message, onFiltered: [] };

        const aiMessage = message as LC.AIMessage;

        const toolCalls = aiMessage.tool_calls ?? [];

        // The wired tools, and whether a call to one of them passes.
        let listed: LC.Tool[];
        let passes: (call: ToolCall) => boolean;

        if (fields.mode === "exclude") {
            const { excludedTools } = this.incomingFor(fields, incoming);

            listed = excludedTools ?? [];

            const names = new Set(listed.map((tool) => tool.name));

            passes = (call) => !names.has(call.name);
        }
        else {
            const { includedTools } = this.incomingFor(fields, incoming);

            listed = includedTools ?? [];

            const names = new Set(listed.map((tool) => tool.name));

            passes = (call) => names.has(call.name);
        }

        const kept: ToolCall[] = [];
        const dropped: ToolCall[] = [];

        for (const call of toolCalls) {
            if (passes(call))
                kept.push(call);
            else
                dropped.push(call);
        }

        const droppedIds   = new Set(dropped.map((call) => call.id));
        const droppedNames = new Set(dropped.map((call) => call.name));

        // The tools whose calls were dropped, for whatever is wired to react.
        const filteredTools = listed.filter((tool) => droppedNames.has(tool.name));

        // Claude carries each call as a content block too; a block left without a result is a 400.
        let content = aiMessage.content;

        if (Array.isArray(content))
            content = content.filter((block) => !(block.type === "tool_use" && droppedIds.has((block as { id?: string }).id)));

        // OpenAI keeps a raw copy of the calls here, and the serializer falls back to it.
        const { tool_calls: _rawCalls, ...additionalKwargs } = aiMessage.additional_kwargs;

        const gated = new LC.AIMessage({
            id:                aiMessage.id,
            name:              aiMessage.name,
            content,
            tool_calls:        kept,
            additional_kwargs: additionalKwargs,
            response_metadata: aiMessage.response_metadata,
        });

        return {
            message:    gated,
            onFiltered: filteredTools,
        };
    }
}
