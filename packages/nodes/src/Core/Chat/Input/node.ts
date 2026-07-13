import { RegisterNode } from "@pretzel-graph/node-sdk"
import { Blueprint } from "./blueprint"
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferOutputs } from "@pretzel-graph/node-sdk";
import { HumanMessage } from "@langchain/core/messages";
import { Chat, Execution, Webhook } from "@pretzel-graph/shared/domain";
import { api } from "../../../services/AxiosService";
import { InternalChatAPI } from "../internal-api";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static WEBHOOK_PATH = "chat" as Webhook.Path;
    public static WEBHOOK_TIMEOUT = 120_000; // 2 minutes

    private message: HumanMessage | null = null;

    protected override onIgniter(igniter: Execution.Igniter): void {
        if (igniter.variant === "chat_message")
            this.injectMessage(igniter.message);
    }

    public injectMessage(chatMessage: Chat.Message): void {
        this.message = new HumanMessage({ content: chatMessage.content });
    }

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        if (!this.message)
            return {};

        const chatId = Chat.Id.parse(this.fieldValues.chat_id);
        const dbMessage: Chat.Message.Human = {
            id: Chat.Message.createId(),
            role: "human",
            content: this.message.content as string,
            chat_id: chatId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        if (this.fieldValues.write_to_session)
            await InternalChatAPI.messageAdd(this.context.executionId, { messages: [dbMessage] });

        return { response: this.message };
    }

    private async waitForMessage(){
        const { workflowId } = this.context;

        await Webhook.Test.API.register(api, { workflowId, path: Node.WEBHOOK_PATH, method: "POST" });

        const signal = await this.context.realtimeAPI.awaitSignal(
            // @ts-expect-error TODO: Chat.Signal not defined yet
            Chat.Signal.MessageSent.getChannel(this.context.executionId),
            // @ts-expect-error TODO: Chat.Signal not defined yet
            Chat.Signal.MessageSent.Schema,
            Node.WEBHOOK_TIMEOUT
        )

        return new HumanMessage({
            // @ts-expect-error TODO: Chat.Signal not defined yet
            content: signal.message.content,
        })
    }
}
