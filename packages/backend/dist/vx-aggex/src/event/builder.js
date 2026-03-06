"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBuilder = void 0;
const domain_1 = require("@vx-agent-editor/shared/domain");
class EventBuilder {
    constructor(jobId, workflowId) {
        this.jobId = jobId;
        this.workflowId = workflowId;
        // Topi: job:${jobId}:workflow
        this.workflow = {
            started: () => ({
                ...this.base(),
                type: "started",
                topic: domain_1.Orchestrator.Event.getTopic(this.jobId)
            }),
            update: (update) => ({
                ...this.base(),
                type: "update",
                update,
                topic: domain_1.Orchestrator.Event.getTopic(this.jobId)
            }),
            completed: (result) => ({
                ...this.base(),
                type: "completed",
                result,
                topic: domain_1.Orchestrator.Event.getTopic(this.jobId)
            }),
            failed: (error) => ({
                ...this.base(),
                type: "failed",
                error,
                topic: domain_1.Orchestrator.Event.getTopic(this.jobId)
            }),
            node: {
                started: (nodeId) => ({
                    ...this.base(),
                    type: "node:started",
                    nodeId,
                    topic: domain_1.Orchestrator.Event.getTopic(this.jobId)
                }),
                completed: (nodeId, output) => ({
                    ...this.base(),
                    type: "node:completed",
                    nodeId, output,
                    topic: domain_1.Orchestrator.Event.getTopic(this.jobId)
                }),
                stream: (nodeId, content, isChatOutput) => ({
                    ...this.base(),
                    type: "node_messages:chunk",
                    nodeId,
                    chunk: content,
                    isChatOutput,
                    topic: domain_1.Orchestrator.Event.getTopic(this.jobId)
                }),
                error: (nodeId, error) => ({
                    ...this.base(),
                    type: "node:error",
                    nodeId,
                    error,
                    topic: domain_1.Orchestrator.Event.getTopic(this.jobId)
                })
            }
        };
        this.chat = {
            responseCreated: (chatId, responseMessage) => ({
                type: "response:created",
                responseMessage,
                chatId,
                topic: domain_1.Chat.Event.getTopic(chatId)
            }),
            responseChunk: (chatId, responseMessageId, content) => ({
                type: "response:chunk",
                chatId,
                responseMessageId,
                content,
                topic: domain_1.Chat.Event.getTopic(chatId)
            })
        };
        // Topic job:${jobId}:stream:${nodeId}
        this.stream = (nodeId, content) => ({
            ...this.base(),
            type: "stream:node_output",
            nodeId,
            content,
            topic: domain_1.Orchestrator.Event.getTopic(this.jobId)
        });
    }
    base() {
        return {
            jobId: this.jobId,
            workflowId: this.workflowId,
        };
    }
}
exports.EventBuilder = EventBuilder;
