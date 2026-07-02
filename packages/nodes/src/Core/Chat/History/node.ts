import { RegisterNode, Synthesizer } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { InternalChatAPI } from "../internal-api";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { overwrite, append } = incoming;

        const chatId = this.context.chat_id;

        if (!chatId)
            throw new Error("Chat ID is required for Chat History node");

        if (overwrite) {
            const messages = overwrite.map(msg => Synthesizer.lcToChatMessage(msg, chatId));
            await InternalChatAPI.messageOverwrite(chatId, messages);
            return { history : overwrite };
        } else if (append) {
            const messages = append.map(msg => Synthesizer.lcToChatMessage(msg, chatId));
            await InternalChatAPI.messageAdd({ messages });
        }

        const { data } = await InternalChatAPI.messageList(chatId);

        return {
            history: (data?.messages ?? []).map(msg => Synthesizer.chatMessageToLC(msg)),
        };
    }
}
