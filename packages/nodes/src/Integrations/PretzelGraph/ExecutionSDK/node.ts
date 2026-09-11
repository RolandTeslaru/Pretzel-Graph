import { RuntimeNode, type InferIncoming } from "@pretzel-graph/node-sdk";
import { Execution, Workflow, type Chat } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(incoming: InferIncoming<typeof Blueprint>) {
        const f   = this.fieldValues;
        const api = this.context.internalAPI;

        if (f.isConvertedToTool === true)
            return { tools: buildTools(api) };

        if (f.action === "run") {
            // Source and igniter are sibling branches, so each is narrowed by what it declares.
            const igniter = "chatMessage" in f
                ? Execution.buildIgniter({ variant: "chat", message: f.chatMessage, chatId: (f.chatId || undefined) as Chat.Id | undefined, record: f.record })
                : Execution.buildIgniter({ variant: "manual", record: f.record });
            const executionId = (f.proposedExecutionId || undefined) as Execution.Id | undefined;

            if ("workflowId" in f)
                return { result: await Execution.API.run(api.raw, f.workflowId as Workflow.Id, { executionId, igniter }) };

            const slots = this.incomingFor(f, incoming);

            if (!("workflow" in slots))
                throw new Error("Run by data needs a workflow on the input");

            const { id, data } = Workflow.Schema.pick({ id: true, data: true }).parse(slots.workflow);

            return { result: await Execution.API.run(api.raw, id, { workflowData: data, executionId, igniter }) };
        }

        const executionId = f.executionId as Execution.Id;

        switch (f.action) {
            case "pause":     return { result: await Execution.API.pause(api.raw, executionId) };
            case "resume":    return { result: await Execution.API.resume(api.raw, executionId) };
            case "suspend":   return { result: await Execution.API.suspend(api.raw, executionId) };
            case "terminate": return { result: await Execution.API.terminate(api.raw, executionId) };
            case "get":       return { result: await Execution.API.get(api.raw, executionId) };
        }

        throw new Error("Unsupported action");
    }
}
