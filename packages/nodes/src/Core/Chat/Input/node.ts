import { Blueprint } from "./blueprint"
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferOutputs } from "@pretzel-graph/node-sdk";
import { HumanMessage } from "@langchain/core/messages";
import { Chat, Execution } from "@pretzel-graph/shared/domain";
import { InternalChatAPI } from "../internal-api";

const MESSAGE_WAIT_MS = 300_000; // 5 minutes

export class Node extends RuntimeNode<typeof Blueprint> {

    private message: Chat.Message | null = null;

    
    protected override onIgniter(igniter: Execution.Igniter): void {
        if (igniter.variant === "chat_message")
            this.message = igniter.message
    }


    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        if (!this.message)
            this.message = await this.waitForMessage();

        const chatId = Chat.Id.parse(this.fieldValues.chat_id);

        if (this.fieldValues.write_to_session)
            await InternalChatAPI.messageAdd(this.context.internalAPI, chatId, [this.message]);

        const msg = new HumanMessage({ content: this.message.content });

        return { response: msg };
    }


    // Started without a message, so park until one is sent from the chat.
    private async waitForMessage(): Promise<Chat.Message> {
        const answer = await this.context.consultationAPI.consult({
            requestSchema: Chat.Consultation.Request,
            answerSchema:  Chat.Consultation.Answer,
            request: {
                nodeId:    this.nodeId,
                variant:   Chat.Consultation.Variant,
                timeoutMs: MESSAGE_WAIT_MS,
            },
        });

        return answer.message;
    }
}
