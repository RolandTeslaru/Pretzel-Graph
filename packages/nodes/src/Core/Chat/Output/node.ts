import { RegisterNode, Synthesizer } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint"
import { Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFieldValues, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

import { Chat } from "@pretzel-graph/shared/domain";
import { InternalChatAPI } from "../internal-api";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {
    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { messages: lcMessages } = incoming
        const chatId = Chat.Id.parse(this.fieldValues.chat_id);

        const messages = lcMessages.map(lcMsg =>
            Synthesizer.lcToChatMessage(lcMsg)
        );

        this.context.realtimeAPI.emit<Chat.Event.Message.Added>({
            type: "message:added",
            channel: Chat.Event.getChannel(chatId),
            chatId,
            messages
        });

        if(this.fieldValues.write_to_session)
            await InternalChatAPI.messageAdd(this.context.executionId, chatId, messages);

        return {};
    }
}
