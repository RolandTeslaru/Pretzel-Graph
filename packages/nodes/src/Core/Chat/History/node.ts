import { Synthesizer } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Chat } from "@pretzel-graph/shared/domain";
import { InternalChatAPI } from "../internal-api";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";

export class Node extends RuntimeNode<typeof Blueprint> {

    public static readonly Blueprint = Blueprint;

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const { overwrite, append } = incoming;

        const historyHasEdge = this.context.workflowQueryAPI.hasOutputEdge(this.nodeId, "history" as Port.Output.Id)

        const chatId = Chat.Id.parse(this.fieldValues.chat_id);

        if (overwrite) {
            const messages = overwrite.map(msg => Synthesizer.lcToChatMessage(msg));
            await InternalChatAPI.messageOverwrite(this.context.internalAPI, chatId, messages);
            return { history : overwrite };
        } else if (append) {
            const messages = append.map(msg => Synthesizer.lcToChatMessage(msg));
            await InternalChatAPI.messageAdd(this.context.internalAPI, chatId, messages);
        }

        // Nothing reads the history, so there is no need to fetch it.
        if (!historyHasEdge)
            return {};

        const { data } = await InternalChatAPI.messageList(this.context.internalAPI, chatId);

        return {
            history: (data?.messages ?? []).map(msg => Synthesizer.chatMessageToLC(msg)),
        };
    }
}
