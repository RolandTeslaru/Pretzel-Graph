"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const tools_1 = require("@langchain/core/tools");
const v3_1 = require("zod/v3");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const fields = this.fieldValues;
        // defineTool is terminal and total-replacing, so tool mode is a disjoint arm rather than
        // an orthogonal flag — `shape` genuinely doesn't exist here, and `defaultLength` does.
        // No onBuildTool: one entry point, the resolved blueprint decides the shape.
        if (fields.isConvertedToTool === true)
            return {
                tool: (0, tools_1.tool)(async ({ input }) => input.slice(0, fields.defaultLength), {
                    name: "derivative_test",
                    description: "Truncates its input to the node's configured default length.",
                    schema: v3_1.z.object({ input: v3_1.z.string().describe("Text to truncate.") }),
                }),
            };
        const passthrough = incoming.in;
        // `passthrough` is required on every run-mode arm because the base declares it.
        if (fields.shape === "text") {
            // `suffix` is declared by the shape==text branch, so it only exists once narrowed.
            const input = this.incomingFor(fields, incoming);
            const text = `${fields.text}${input.suffix ?? ""}`;
            return {
                passthrough,
                value: text,
            };
        }
        if (fields.shape === "number") {
            if (fields.rounding === "fixed")
                return {
                    passthrough,
                    value: Number(fields.amount.toFixed(fields.decimals)),
                };
            return {
                passthrough,
                value: fields.amount,
            };
        }
        // shape==none matches nothing, so only the base output is owed.
        return { passthrough };
    }
}
exports.Node = Node;
