import { tool } from "@langchain/core/tools";
import { RuntimeNode, InferIncoming, InferOutputs, jsonSchemaToZod } from "@pretzel-graph/node-sdk";
import { Airlock } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        // User-added input ports are resolved into `inputs` and captured here, exposed to
        // the code as $in.inputs. Tool args the model supplies arrive as $in.args per call.
        const schema = jsonSchemaToZod(this.fieldValues.argsSchema);

        const customTool = tool(
            async (args) => {
                const result = await this.context.airlockAPI.executeAsyncCode(
                    Airlock.Source.asCode(this.fieldValues.code),
                    this.nodeId,
                    { args, inputs: incoming },
                );
                return typeof result === "string" ? result : JSON.stringify(result);
            },
            {
                name: this.fieldValues.toolName || "custom_tool",
                description: this.fieldValues.toolDescription || "A custom user-defined tool.",
                schema,
            },
        );

        return { tool: customTool };
    }
}
