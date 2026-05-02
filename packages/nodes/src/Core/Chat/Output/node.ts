import { RegisterNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint"
import { Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFields, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";

import { Chat } from "@pretzel-graph/shared/domain";
import { LC } from "@pretzel-graph/node-sdk";
import { InternalChatAPI } from "../internal-api";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    private chatId: Chat.Id | null = null;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
    }

    protected override async onCompile() {
        this.chatId = this.context.chat_id ?? null;

        if (!this.chatId)
            return;
    }

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { messages: lcMessages } = inputs

        if (!this.chatId)
            return {};

        const messages: Chat.Message[] = lcMessages.map(_lcMsg => {
            const base = {
                id: Chat.Message.createId(),
                chat_id: this.chatId!,
                content: _lcMsg.text,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            switch (_lcMsg.type) {
                case "ai": {
                    const lcMsg = _lcMsg as LC.AIMessage;
                    return {
                        ...base,
                        role: "ai",
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
                case "human":
                    return { ...base, role: "human" } satisfies Chat.Message.Human;
                case "tool": {
                    const lcMsg = _lcMsg as LC.ToolMessage;
                    return {
                        ...base,
                        role: "tool",
                        data: {
                            tool_call_id: Chat.ToolCall.Id.parse(lcMsg.tool_call_id),
                            tool_name: lcMsg.name ?? "",
                            status: "success" as const,
                        },
                    } satisfies Chat.Message.Tool;
                }
                case "system":
                    return { ...base, role: "system" } satisfies Chat.Message.System;
                default:
                    throw new Error(`Unsupported LangChain message type "${_lcMsg.type}"`);
            }
        });


        this.emit<Chat.Event.Message.Added>({
            type: "message:added",
            channel: Chat.Event.getChannel(this.chatId),
            chatId: this.chatId,
            messages
        });

        await InternalChatAPI.messageAdd({ messages });

        return {};
    }
}