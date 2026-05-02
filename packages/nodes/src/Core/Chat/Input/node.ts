import { RegisterNode } from "@pretzel-graph/node-sdk"
import { Blueprint } from "./blueprint"
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { HumanMessage } from "@langchain/core/messages";
import { Chat, Webhook } from "@pretzel-graph/shared/domain";
import { api } from "../../../services/AxiosService";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static WEBHOOK_PATH = "chat" as Webhook.Path;
    public static WEBHOOK_TIMEOUT = 120_000; // 2 minutes

    public readonly Blueprint = Blueprint;

    private message: HumanMessage | null = null;

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