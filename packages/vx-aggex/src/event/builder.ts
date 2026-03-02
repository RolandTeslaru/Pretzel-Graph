import { Chat, Orchestrator, Realtime, Workflow } from "@vx-agent-editor/shared/domain";
import { RuntimeState } from "..";

export class EventBuilder {
    constructor(
        public readonly jobId: Orchestrator.Job.Id,
        public readonly workflowId: Workflow.Id,
    ) { }

    private base() {
        return {
            jobId: this.jobId,
            workflowId: this.workflowId,
            timestamp: Date.now()
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
            )
        }
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