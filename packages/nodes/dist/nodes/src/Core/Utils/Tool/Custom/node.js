"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const tools_1 = require("@langchain/core/tools");
const v3_1 = require("zod/v3");
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
const domain_1 = require("../../../../../../shared/domain");
// Minimal JSON-Schema → Zod for tool-arg shapes (objects of primitives/enums/arrays).
// Built with the same `zod/v3` import the rest of the nodes use, so the schema is the
// instance `tool()` validates against — no cross-zod-version `instanceof` mismatch.
function jsonSchemaToZod(schema) {
    if (!schema || typeof schema !== "object")
        return v3_1.z.any();
    switch (schema.type) {
        case "string":
            return Array.isArray(schema.enum) && schema.enum.length
                ? v3_1.z.enum(schema.enum)
                : v3_1.z.string();
        case "number":
            return v3_1.z.number();
        case "integer":
            return v3_1.z.number().int();
        case "boolean":
            return v3_1.z.boolean();
        case "array":
            return v3_1.z.array(jsonSchemaToZod(schema.items ?? {}));
        case "object": {
            const required = new Set(schema.required ?? []);
            const shape = {};
            for (const [key, raw] of Object.entries(schema.properties ?? {})) {
                let field = jsonSchemaToZod(raw);
                const description = raw?.description;
                if (description)
                    field = field.describe(description);
                shape[key] = required.has(key) ? field : field.optional();
            }
            return v3_1.z.object(shape);
        }
        default:
            return v3_1.z.any();
    }
}
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        // User-added input ports are resolved into `inputs` and captured here, exposed to
        // the code as $in.inputs. Tool args the model supplies arrive as $in.args per call.
        const schema = jsonSchemaToZod(this.fieldValues.argsSchema);
        const customTool = (0, tools_1.tool)(async (args) => {
            const result = await this.context.airlockAPI.executeAsyncCode(domain_1.Airlock.Source.asCode(this.fieldValues.code), this.nodeId, { args, inputs: incoming });
            return typeof result === "string" ? result : JSON.stringify(result);
        }, {
            name: this.fieldValues.toolName || "custom_tool",
            description: this.fieldValues.toolDescription || "A custom user-defined tool.",
            schema,
        });
        return { tool: customTool };
    }
}
exports.Node = Node;
