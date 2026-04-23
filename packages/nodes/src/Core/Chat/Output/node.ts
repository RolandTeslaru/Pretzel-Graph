import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint"
import { Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFields, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";

import { Chat } from "@pretzel-graph/shared/domain";
import { AxiosService } from "../../../services/AxiosService";
import { LC } from "@pretzel-graph/node-sdk";

const InternalChatAPI = {
    messageAdd: (payload: Chat.API.Message.Add.Request) =>
        AxiosService.api.post('/api/internal/chat/message/add', payload),
    messageUpdate: (payload: Chat.API.Message.Update.Request) =>
        AxiosService.api.post('/api/internal/chat/message/update', payload),
};

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    private chatId: Chat.Id | null = null;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
    }

    protected override async onCompile() {
        const session = this.context.session
        const workflowCache = this.context.workflowCache;

        const incomingEdges = workflowCache.incomingEdgesMap[this.workflowNode.id];
        const upstreamNodeId = Object.keys(incomingEdges)[0] as Workflow.Node.Id | undefined;

        const chatId = session.chatId;

        if (!chatId)
            return;

        this.chatId = chatId;
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { messages: lcMessages } = inputs

        this.context.updateSession(d => {
            lcMessages.forEach(msg => {
                d.messages.push(msg);
            })
        });

        if (!this.chatId)
            return {};

        let error = null;

        const messages: Chat.Message[] = lcMessages.map(_lcMsg => {
            if (_lcMsg.type === "ai") {
                const lcMsg = _lcMsg as LC.AIMessage;
                return {
                    id: Chat.Message.createId(),
                    role: "ai",
                    content: lcMsg.text,
                    chat_id: this.chatId!,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    job_id: this.context.jobId,
                    data: {
                        isProcessing: false,
                        tool_calls: (lcMsg.tool_calls ?? []).map(tc => ({
                            id: Chat.ToolCall.Id.parse(tc.id ?? crypto.randomUUID()),
                            name: tc.name,
                            arguments: tc.args,
                        })),
                    },
                } satisfies Chat.Message.AI;
            }

            if (_lcMsg.type === "human") {
                return {
                    id: Chat.Message.createId(),
                    role: "human",
                    content: _lcMsg.text,
                    chat_id: this.chatId!,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    job_id: this.context.jobId,
                } satisfies Chat.Message.Human;
            }

            if (_lcMsg.type === "tool") {
                const lcMsg = _lcMsg as LC.ToolMessage;
                return {
                    id: Chat.Message.createId(),
                    role: "tool",
                    content: lcMsg.text,
                    chat_id: this.chatId!,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    job_id: this.context.jobId,
                    data: {
                        tool_call_id: Chat.ToolCall.Id.parse(lcMsg.tool_call_id),
                        tool_name: lcMsg.name ?? "",
                        status: "success" as const,
                    },
                } satisfies Chat.Message.Tool;
            }

            if (_lcMsg.type === "system") {
                return {
                    id: Chat.Message.createId(),
                    role: "system",
                    content: _lcMsg.text,
                    chat_id: this.chatId!,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    job_id: this.context.jobId,
                } satisfies Chat.Message.System;
            }

            error = new Error(`Unsupported LangChain message type "${_lcMsg.type}"`);
            return null as never;
        });


        this.emit<Chat.Event.Message.Added>({
            type: "message:added",
            channel: Chat.Event.getChannel(this.chatId),
            chatId: this.chatId,
            messages
        });

        // this.emit<Chat.Event.Response.Finished>({
        //     type: "response:finished",
        //     channel: Chat.Event.getChannel(this.chatId),
        //     responseMessageId: this.responseMessageId!,
        //     finalContent: content,
        //     chatId: this.chatId,
        // });

        await InternalChatAPI.messageAdd({ messages });

        if(error)
            throw error;

        return {};
    }
}