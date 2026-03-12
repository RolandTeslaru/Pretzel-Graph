import { Chat, Orchestrator, Realtime, Workflow } from "@vx-agent-editor/shared/domain";

export class EventBuilder {
    constructor(
        public readonly jobId: Orchestrator.Job.Id,
        public readonly workflowId: Workflow.Id,
    ) { }

    private base() {
        return {
            jobId: this.jobId,
            workflowId: this.workflowId,
        };
    }
    // Topi: job:${jobId}:workflow


    public readonly workflow = {
        started: () => (
            {
                ...this.base(),
                type: "started",
                topic: Orchestrator.Event.getTopic(this.jobId)
            } satisfies Orchestrator.Event.Job.Started
        ),
        update: (update: Orchestrator.Event.Job.Update["update"]) => (
            {
                ...this.base(),
                type: "update",
                update,
                topic: Orchestrator.Event.getTopic(this.jobId)
            } satisfies Orchestrator.Event.Job.Update
        ),
        completed: (result: string) => (
            {
                ...this.base(),
                type: "completed",
                result,
                topic: Orchestrator.Event.getTopic(this.jobId)
            } satisfies Orchestrator.Event.Job.Completed
        ),
        failed: (error: string) => (
            {
                ...this.base(),
                type: "failed",
                error,
                topic: Orchestrator.Event.getTopic(this.jobId)
            } satisfies Orchestrator.Event.Job.Failed
        ),
        node: {
            started: (nodeId: Workflow.Node.Id) => (
                {
                    ...this.base(),
                    type: "node:started",
                    nodeId,
                    topic: Orchestrator.Event.getTopic(this.jobId)
                } satisfies Orchestrator.Event.Job.Node.Started
            ),
            completed: (nodeId: Workflow.Node.Id, output: unknown) => (
                {
                    ...this.base(),
                    type: "node:completed",
                    nodeId, output,
                    topic: Orchestrator.Event.getTopic(this.jobId)
                } satisfies Orchestrator.Event.Job.Node.Completed
            ),
            stream: (nodeId: Workflow.Node.Id, content: string, isChatOutput?: boolean) => (
                {
                    ...this.base(),
                    type: "node_messages:chunk",
                    nodeId,
                    chunk: content,
                    isChatOutput,
                    topic: Orchestrator.Event.getTopic(this.jobId)
                } satisfies Orchestrator.Event.Job.MessageChunk
            ),
            error: (nodeId: Workflow.Node.Id, error: any) => (
                {
                    ...this.base(),
                    type: "node:error",
                    nodeId,
                    error,
                    topic: Orchestrator.Event.getTopic(this.jobId)
                } satisfies Orchestrator.Event.Job.Node.Error
            )
        }
    }

    public readonly chat = {
        responseCreated: (chatId: Chat.Id, responseMessage: Chat.Message.AI) => (
            {
                type: "response:created",
                responseMessage,
                chatId,
                topic: Chat.Event.getTopic(chatId)
            } satisfies Chat.Event.ResponseCreated
        ),
        responseChunk: (chatId: Chat.Id, responseMessageId: Chat.Message.Id, content: string) => (
            {
                type: "response:chunk",
                chatId,
                responseMessageId,
                content,
                topic: Chat.Event.getTopic(chatId)
            } satisfies Chat.Event.ResponseChunk
        )
    }

    // Topic job:${jobId}:stream:${nodeId}

    public readonly stream = (nodeId: Workflow.Node.Id, content: string) => (
        {
            ...this.base(),
            type: "stream:node_output",
            nodeId,
            content,
            topic: Orchestrator.Event.getTopic(this.jobId)
        }
    )
}