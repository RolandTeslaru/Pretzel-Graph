import { RegisterNode } from "src/services/Catalogue/service";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "src/node";
import { ExecutionContext } from "src/context";
import { InferInputs, InferOutputs } from "src/types";
import { LC } from "src/langchain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    protected override async onRun(
        context: ExecutionContext,
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
                    const result = tool?.invoke(call.args);

                    return new LC.ToolMessage({
                        content: result ? JSON.stringify(result) : "",
                        tool_call_id: call.id ?? crypto.randomUUID(),
                    });
                } else {
                    return new LC.ToolMessage({
                        content: "Could not find tool with name " + call.name,
                        tool_call_id: call.id ?? crypto.randomUUID(),
                    });
                }
            })
        );

        return {
            toolOutputs: toolMessages,
        };
    }
}
