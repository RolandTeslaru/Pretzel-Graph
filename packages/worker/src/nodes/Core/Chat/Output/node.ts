import { RegisterNode } from "../../../../services/Catalogue/service";
import { Blueprint } from "./blueprint"
import { Workflow } from "@vx-agent-editor/shared/domain";
import { RuntimeNode } from "src/node";
import { ExecutionContext } from "src/context";
import { InferFields, InferInputs, InferOutputs } from "src/types";

import { Chat } from "@vx-agent-editor/shared/domain";
import { AxiosService } from "src/axios";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {



    private responseMessageId: Chat.Message.Id | null = null;
    private chatId: Chat.Id | null = null;

    constructor(workflowNode: Workflow.Node, context: ExecutionContext) {
        super(workflowNode, context);
    }

    public override async init(context: ExecutionContext) {
        const incomingEdges = context.workflowCache.incomingEdgesMap[this.workflowNode.id];
        const upstreamNodeId = Object.keys(incomingEdges)[0] as Workflow.Node.Id | undefined;

        if (upstreamNodeId) {
            const chatId = context.session.chatId;

            if (!chatId)
                return;

            this.chatId = chatId;

            // Create the response message
            const responseMessage = {
                id: Chat.Message.createId(),
                role: "ai",
                content: "",
                job_id: context.jobId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                chat_id: chatId!,
                data: {
                    isProcessing: true,
                    tool_calls: []
                }
            } satisfies Chat.Message.AI

            this.responseMessageId = responseMessage.id;

            await Chat.API.Message.respond(AxiosService.api, { responseMessage })
            console.log("Created response message with id ", responseMessage.id, " for chat ", chatId)


            this.emit<Chat.Event.Response.Created>({
                type: "response:created",
                channel: Chat.Event.getChannel(chatId),
                responseMessage,
                chatId
            })


            // Listen and emit chunks as they come from the LLM
            context.streamController.onLlmChunk(upstreamNodeId, (content) => {
                this.emit<Chat.Event.Response.Chunk>({
                    type: "response:chunk",
                    channel: Chat.Event.getChannel(chatId),
                    chatId,
                    responseMessageId: responseMessage.id,
                    content
                })
            })
        }
    }

    protected override async onRun(
        context: ExecutionContext,
        inputs: InferInputs<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { input } = inputs;

        context.updateSession(d => {
            d.messages.push(input);
        });

        const rawContent = input.content;
        const content = typeof rawContent === "string"
            ? rawContent
            : rawContent
                .map((b: any) => typeof b === "string" ? b : ("text" in b ? b.text : ""))
                .join("");


        if (this.responseMessageId && this.chatId) {
            this.emit<Chat.Event.Response.Finished>({
                type: "response:finished",
                channel: Chat.Event.getChannel(this.chatId!),
                responseMessageId: this.responseMessageId!,
                finalContent: content,
                chatId: this.chatId!,
            })

            await Chat.API.Message.update(AxiosService.api, {
                messageId: this.responseMessageId!,
                content
            })
        }

        return {};
    }
}