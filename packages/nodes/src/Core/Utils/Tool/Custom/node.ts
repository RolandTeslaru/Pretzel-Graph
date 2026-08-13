import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";
import { RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Airlock } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";

// Minimal JSON-Schema → Zod for tool-arg shapes (objects of primitives/enums/arrays).
// Built with the same `zod/v3` import the rest of the nodes use, so the schema is the
// instance `tool()` validates against — no cross-zod-version `instanceof` mismatch.
function jsonSchemaToZod(schema: any): z.ZodTypeAny {
    if (!schema || typeof schema !== "object")
        return z.any();

    switch (schema.type) {
        case "string":
            return Array.isArray(schema.enum) && schema.enum.length
                ? z.enum(schema.enum as [string, ...string[]])
                : z.string();
        case "number":
            return z.number();
        case "integer":
            return z.number().int();
        case "boolean":
            return z.boolean();
        case "array":
            return z.array(jsonSchemaToZod(schema.items ?? {}));
        case "object": {
            const required = new Set<string>(schema.required ?? []);
            const shape: Record<string, z.ZodTypeAny> = {};
            for (const [key, raw] of Object.entries(schema.properties ?? {})) {
                let field = jsonSchemaToZod(raw);
                const description = (raw as any)?.description;
                if (description)
                    field = field.describe(description);
                shape[key] = required.has(key) ? field : field.optional();
            }
            return z.object(shape);
        }
        default:
            return z.any();
    }
}

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
