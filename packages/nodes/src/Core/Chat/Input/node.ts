import { InferFields, RegisterNode } from "@pretzel-graph/node-sdk"
import { Blueprint } from "./blueprint"
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { HumanMessage } from "@langchain/core/messages";
import { Chat, Execution, Webhook } from "@pretzel-graph/shared/domain";
import { api } from "../../../services/AxiosService";
import { InternalChatAPI } from "../internal-api";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static WEBHOOK_PATH = "chat" as Webhook.Path;
    public static WEBHOOK_TIMEOUT = 120_000; // 2 minutes

    public readonly Blueprint = Blueprint;

    private message: HumanMessage | null = null;

    protected override onIgniter(igniter: Execution.Igniter): void {
        if (igniter.variant === "chat_message")
            this.injectMessage(igniter.message);
    }

    public injectMessage(chatMessage: Chat.Message): void {
        this.message = new HumanMessage({ content: chatMessage.content });
    }

    protected override async onRun(): Promise<InferOutputs<typeof Blueprint>> {
        if (!this.message) {
            try {
                this.message = await this.waitForMessage();
            } catch (e) {
                console.error(`[ChatInputNode] Error while waiting for message:`, e);
                throw new Error(`Failed to receive chat message within ${Node.WEBHOOK_TIMEOUT / 1000} seconds. Please ensure the webhook is being called correctly.`);
            }
        }

        const chatId = this.context.chat_id;
        if (chatId && this.fields.write_to_session) {
            const dbMessage: Chat.Message.Human = {
                id: Chat.Message.createId(),
                role: "human",
                content: this.message.content as string,
                chat_id: chatId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            await InternalChatAPI.messageAdd({ messages: [dbMessage] });
        }

        return { response: this.message };
    }


    private async waitForMessage(){
        const { workflowId } = this.context;


        await Webhook.Test.API.register(api, { workflowId, path: Node.WEBHOOK_PATH, method: "POST" });

        const signal = await this.CreateSignalPromise(
            Chat.Signal.MessageSent.getChannel(this.context.executionId),
            Chat.Signal.MessageSent.Schema,
            Node.WEBHOOK_TIMEOUT
        )

        return new HumanMessage({
            content: signal.message.content,
        })
    }
}
