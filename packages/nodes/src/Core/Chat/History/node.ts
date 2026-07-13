import { RegisterNode, Synthesizer } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Chat } from "@pretzel-graph/shared/domain";
import { InternalChatAPI } from "../internal-api";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const { overwrite, append } = incoming;

        const chatId = Chat.Id.parse(this.fieldValues.chat_id);

        if (overwrite) {
            const messages = overwrite.map(msg => Synthesizer.lcToChatMessage(msg));
            await InternalChatAPI.messageOverwrite(this.context.executionId, chatId, messages);
            return { history : overwrite };
        } else if (append) {
            const messages = append.map(msg => Synthesizer.lcToChatMessage(msg));
            await InternalChatAPI.messageAdd(this.context.executionId, chatId, messages);
        }

        const { data } = await InternalChatAPI.messageList(this.context.executionId, chatId);

        return {
            history: (data?.messages ?? []).map(msg => Synthesizer.chatMessageToLC(msg)),
        };
    }
}
