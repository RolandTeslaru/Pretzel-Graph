import { tool } from "@langchain/core/tools";
import { ToolBudget, type HTTP } from "@pretzel-graph/node-sdk";
import { Execution } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";



const executionId = z.string().describe("Execution id, as returned by execution_run.");


export function buildTools(api: HTTP.Client) {

    const run = tool(
        async ({ workflowId, executionId, message, chatId, record }) => ToolBudget.value(
            await Execution.API.run(api.raw, workflowId as never, {
                executionId: executionId as never,
                igniter:     Execution.buildIgniter(
                    message !== undefined
                        ? { variant: "chat", message, chatId: chatId as never, record }
                        : { variant: "manual", record },
                ),
            }),
        ),
        {
            name:        "execution_run",
            description: "Start a run of a workflow from its saved graph. Returns the run, including its id. The run proceeds on its own; use execution_get to check on it.",
            schema: z.object({
                workflowId:    z.string().describe("The workflow to run."),
                executionId:   z.string().optional().describe("Pre-assign the run's id. Usually omitted."),
                message:       z.string().optional().describe("Start the run as a chat message to the workflow. Omitted, the run starts as a manual one."),
                chatId:        z.string().optional().describe("With message: an existing chat to continue. Omitted, a new chat starts."),
                record:        z.boolean().optional().describe("Keep a flight recording of the run."),
            }),
        },
    );


    const signal = (name: string, description: string, send: (id: Execution.Id) => Promise<{ success: boolean }>) => tool(
        async ({ executionId }) => ToolBudget.value(await send(executionId as Execution.Id)),
        { name, description, schema: z.object({ executionId }) },
    );

    const pause     = signal("execution_pause",     "Pause a running execution. Returns whether the run took the signal.",                     id => Execution.API.pause(api.raw, id));
    const resume    = signal("execution_resume",    "Resume a paused execution. Returns whether the run took the signal.",                    id => Execution.API.resume(api.raw, id));
    const suspend   = signal("execution_suspend",   "Suspend an execution so it can be picked up later. Returns whether the run took the signal.", id => Execution.API.suspend(api.raw, id));
    const terminate = signal("execution_terminate", "Stop an execution for good. Returns whether the run took the signal.",                   id => Execution.API.terminate(api.raw, id));


    const get = tool(
        async ({ executionId }) => ToolBudget.value(await Execution.API.get(api.raw, executionId as Execution.Id)),
        {
            name:        "execution_get",
            description: "Get an execution: its status, duration, igniter, and session state. Read-only.",
            schema:      z.object({ executionId }),
        },
    );


    return [run, pause, resume, suspend, terminate, get];
}
