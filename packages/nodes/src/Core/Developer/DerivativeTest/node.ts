import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(incoming: InferIncoming<typeof Blueprint>) {

        const fields = this.fieldValues;

        // defineTool is terminal and total-replacing, so tool mode is a disjoint arm rather than
        // an orthogonal flag — `shape` genuinely doesn't exist here, and `defaultLength` does.
        // No onBuildTool: one entry point, the resolved blueprint decides the shape.
        if (fields.isConvertedToTool === true)
            return {
                tool: tool(
                    async ({ input }: { input: string }) => input.slice(0, fields.defaultLength),
                    {
                        name:        "derivative_test",
                        description: "Truncates its input to the node's configured default length.",
                        schema:      z.object({ input: z.string().describe("Text to truncate.") }),
                    },
                ),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        const passthrough = incoming.in;

        // `passthrough` is required on every run-mode arm because the base declares it.
        if (fields.shape === "text") {
            // `suffix` is declared by the shape==text branch, so it only exists once narrowed.
            const input = this.incomingFor(fields, incoming);
            const text  = `${fields.text}${input.suffix ?? ""}`;

            return {
                passthrough,
                value:  text,
                length: text.length,
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        if (fields.shape === "number") {

            if (fields.rounding === "fixed")
                return {
                    passthrough,
                    value:     Number(fields.amount.toFixed(fields.decimals)),
                    precision: fields.decimals,
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            return {
                passthrough,
                value: fields.amount,
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        // shape==none matches nothing, so only the base output is owed.
        return { passthrough } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }
}
