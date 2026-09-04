import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { Airlock, type Workflow } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";


type Runner = {
    airlockAPI: Pick<Airlock.API, "executeAsyncCode">;
    nodeId:     Workflow.Node.Id;
    incoming:   unknown;
};

// The sigils the sandbox binds for code-mode source. `$item` / `$itemIndex` are bound only for
// item-scoped fields, so they are deliberately absent here.
const SCOPE = [
    "$in — the data wired into this node's input ports.",
    "$node — this node's own definition (id, blueprintId, fields, inputs, outputs).",
    "$workflow — the whole graph: { id, nodes, staticValues, edges, credentialInstanceIds }, keyed by node id.",
    "$globalFields — the workflow's global field values, keyed by field id.",
    "$igniter — the payload that started this execution.",
    "$globals — a mutable scratch object shared by every node for the length of the execution.",
    "$nodeGlobals — the same, but private to this node and preserved across re-fires.",
].map(line => `- ${line}`).join("\n");

const DESCRIPTION = [
    "Run TypeScript in a sandbox and return whatever the code returns.",
    "The code is an async function body — it must `return` its result, and may `await`.",
    "Type annotations are allowed and are stripped before execution, so they are never checked: they document intent only.",
    "There is no network, filesystem, module, or console access — this computes over the values already in scope.",
    "",
    "In scope:",
    SCOPE,
].join("\n");


export function buildTools(runner: Runner) {
    const runCode = tool(
        async ({ code }) => {
            try {
                const result = await runner.airlockAPI.executeAsyncCode(
                    Airlock.Source.asCode(code),
                    runner.nodeId,
                    runner.incoming,
                );

                return ToolBudget.value(
                    { result },
                    {
                        hint: "Return a summary or a smaller slice instead of the whole value.",
                    },
                );
            }
            catch (error) {
                // OOM disposed the shared isolate — the run cannot continue, so this must not
                // come back to the model as a retryable error.
                if (error instanceof Error && error.name === Airlock.TERMINATION_ERROR_NAME)
                    throw error;

                return ToolBudget.value({
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        },
        {
            name:        "run_code",
            description: DESCRIPTION,
            schema: z.object({
                code: z.string()
                    .describe(
                        "TypeScript to run: an async function body that must `return` a value. "
                        + "The $ sigils listed in this tool's description are in scope.",
                    ),
            }),
        },
    );

    return [runCode];
}
