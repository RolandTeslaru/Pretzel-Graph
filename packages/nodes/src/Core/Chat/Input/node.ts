import { RegisterNode } from "@pretzel-graph/node-sdk"
import { Blueprint } from "./blueprint"
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferOutputs } from "@pretzel-graph/node-sdk";
import { HumanMessage } from "@langchain/core/messages";
import { Chat, Execution, Webhook } from "@pretzel-graph/shared/domain";
import { InternalChatAPI } from "../internal-api";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static WEBHOOK_PATH = "chat" as Webhook.Path;
    public static WEBHOOK_TIMEOUT = 120_000; // 2 minutes


    private message: Chat.Message | null = null;

    
    protected override onIgniter(igniter: Execution.Igniter): void {
        if (igniter.variant === "chat_message")
            this.message = igniter.message
    }


    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        if (!this.message)
            return {};

        const chatId = Chat.Id.parse(this.fieldValues.chat_id);

        if (this.fieldValues.write_to_session)
            await InternalChatAPI.messageAdd(this.context.internalAPI, chatId, [this.message]);

        const msg = new HumanMessage({ content: this.message.content });

        return { response: msg };
    }


    // Registering the route is what invites the reply, so it runs inside awaitSignalAfter —
    // the waiter is already in place when the first message can arrive.
    private async waitForMessage(){
        const { workflowId } = this.context;

        const signal = await this.context.realtimeAPI.awaitSignalAfter(
            // @ts-expect-error TODO: Chat.Signal not defined yet
            Chat.Signal.MessageSent.Schema,
            () => true,
            Node.WEBHOOK_TIMEOUT,
            () => Webhook.Test.API.register(
                this.context.internalAPI.raw,
                { workflowId, path: Node.WEBHOOK_PATH, method: "POST", timeoutMs: Node.WEBHOOK_TIMEOUT },
            ).then(() => {}),
        )

        return new HumanMessage({
            // @ts-expect-error TODO: Chat.Signal not defined yet
            content: signal.message.content,
        })
    }
}
