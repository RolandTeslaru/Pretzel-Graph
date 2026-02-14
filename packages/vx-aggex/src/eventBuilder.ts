import { Orchestrator, Realtime, Workflow } from "@vx-agent-editor/shared/domain";

export class EventBuilder {
    constructor(
        private jobId: Orchestrator.Job.Id,
        private workflowId: Workflow.Id,
        private topicId: Realtime.Topic.Id
    ) { }
    private base() {
        return {
            jobId: this.jobId,
            workflowId: this.workflowId,
            topicId: this.topicId,
            timestamp: Date.now()
        };
    }
    started(): Orchestrator.Event.Job.Started {
        return { ...this.base(), type: "job:started" };
    }
    update(update: Orchestrator.Event.Job.Update["update"]): Orchestrator.Event.Job.Update {
        return { ...this.base(), type: "job:update", update };
    }
    completed(result: string): Orchestrator.Event.Job.Completed {
        return { ...this.base(), type: "job:completed", result };
    }
    failed(error: string): Orchestrator.Event.Job.Failed {
        return { ...this.base(), type: "job:failed", error };
    }
    nodeStarted(nodeId: Workflow.Node.Id): Orchestrator.Event.Job.Node.Started {
        return { ...this.base(), type: "job:node:started", nodeId };
    }
    nodeCompleted(nodeId: Workflow.Node.Id, output: unknown): Orchestrator.Event.Job.Node.Completed {
        return { ...this.base(), type: "job:node:completed", nodeId, output };
    }
}