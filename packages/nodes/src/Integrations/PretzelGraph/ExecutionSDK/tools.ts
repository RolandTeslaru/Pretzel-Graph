import { tool } from "@langchain/core/tools";
import { ToolBudget, type HTTP } from "@pretzel-graph/node-sdk";
import { Execution } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";



const executionId = z.string();

// Request config that disables retries for run requests.
export const NO_RETRY: HTTP.RequestConfig = { retryable: () => false };


export function buildTools(api: HTTP.Client) {

    const runSchema = {
        workflowId:  z.string(),
        message:     z.string().optional().describe("Start the run as a chat message to the workflow. Omitted, the run starts as a manual one."),
        chatId:      z.string().optional().describe("With message: an existing chat to continue. Omitted, a new chat starts."),
        record:      z.boolean().optional().describe("Keep a flight recording of the run."),
    };

    const timeoutSeconds = z.number().int().positive().max(600).optional()
        .describe("Seconds to hold for, default 300. Past it the run is returned as it stands, with settled false, and keeps going.");

    const NODE_RESULTS = "Node errors are in session.node_status[nodeId].error; the top-level error can be empty. Outputs are in session.node_output_projections.";

    const RUN_NOTE = "Fails if the workflow has validation issues or nodes whose blueprints no longer exist.";

    const start = (args: { workflowId: string, message?: string, chatId?: string, record?: boolean }, wait?: { timeoutMs: number }) =>
        Execution.API.run(api.raw, args.workflowId as never, {
            igniter:     Execution.buildIgniter(
                args.message !== undefined
                    ? { variant: "chat", message: args.message, chatId: args.chatId as never, record: args.record }
                    : { variant: "manual", record: args.record },
            ),
            await: wait,
        }, NO_RETRY);

    const run = tool(
        async (args) => ToolBudget.value(await start(args)),
        {
            name:        "execution_run",
            description: `Start a run of a workflow and return once it has been picked up, with its id and status pending. Follow it with execution_wait or execution_get. ${RUN_NOTE}`,
            schema:      z.object(runSchema),
        },
    );


    const runAndAwait = tool(
        async ({ timeoutSeconds, ...args }) => ToolBudget.value(await start(args, { timeoutMs: (timeoutSeconds ?? 300) * 1_000 })),
        {
            name:        "execution_run_and_await",
            description: `Start a run of a workflow and hold until it settles. Returns the run as it ended, with settled true, or as it stands at the timeout, with settled false. ${NODE_RESULTS} ${RUN_NOTE}`,
            schema:      z.object({ ...runSchema, timeoutSeconds }),
        },
    );


    const wait = tool(
        async ({ executionId, timeoutSeconds }) => ToolBudget.value(
            await Execution.API.wait(api.raw, executionId as Execution.Id, { timeoutMs: (timeoutSeconds ?? 300) * 1_000 }),
        ),
        {
            name:        "execution_wait",
            description: `Hold until an execution completes, fails or is terminated. Safe to call on one that already has. Returns the run with settled true, or as it stands at the timeout with settled false. ${NODE_RESULTS}`,
            schema:      z.object({ executionId, timeoutSeconds }),
        },
    );


    const signal = (name: string, description: string, send: (id: Execution.Id) => Promise<{ success: boolean }>) => tool(
        async ({ executionId }) => ToolBudget.value(await send(executionId as Execution.Id)),
        { name, description, schema: z.object({ executionId }) },
    );

    const pause     = signal("execution_pause",     "Pause a running execution. A run left paused for 5 minutes is terminated. Returns whether the run took the signal.", id => Execution.API.pause(api.raw, id));
    const resume    = signal("execution_resume",    "Resume a paused execution. Returns whether the run took the signal.",                                                id => Execution.API.resume(api.raw, id));
    const terminate = signal("execution_terminate", "Stop an execution for good. Returns whether the run took the signal.",                                               id => Execution.API.terminate(api.raw, id));


    const get = tool(
        async ({ executionId }) => ToolBudget.value(await Execution.API.get(api.raw, executionId as Execution.Id)),
        {
            name:        "execution_get",
            description: `Get an execution: its status, error, duration, igniter and session state. ${NODE_RESULTS} Read-only.`,
            schema:      z.object({ executionId }),
        },
    );


    return [run, runAndAwait, wait, pause, resume, terminate, get];
}
