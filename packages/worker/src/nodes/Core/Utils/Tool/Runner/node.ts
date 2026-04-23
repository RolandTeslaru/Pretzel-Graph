import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "src/node";
import { InferInputs, InferOutputs } from "src/types";
import { LC } from "src/langchain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { tools, input } = inputs;

        const aiMessage = input as any as LC.AIMessage;

        if (!aiMessage.tool_calls)
            return { toolOutputs: [] }

        const toolsMap = new Map(tools.map(tool => [tool.name, tool]));

        const toolMessages = await Promise.all(
            aiMessage.tool_calls.map(async (call) => {
                const tool = toolsMap.get(call.name);

                if (tool) {
                    try {
                        const result = await tool.invoke(
                            call, 
                            {
                                signal: this.context.abortSignal,
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
            toolOutputs: toolMessages,
        };
    }
}
