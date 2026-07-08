import { RegisterNode, Synthesizer } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint"
import { Workflow } from "@pretzel-graph/shared/domain";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferFieldValues, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

import { Chat } from "@pretzel-graph/shared/domain";
import { InternalChatAPI } from "../internal-api";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    private chatId: Chat.Id | null = null;

    constructor(workflowNode: Workflow.Node.Raw, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
    }

    protected override async onCompile() {
        this.chatId = this.context.chat_id ?? null;

        if (!this.chatId)
            return;
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>
    ): Promise<InferOutputs<typeof Blueprint>> {

        const { messages: lcMessages } = incoming

        if (!this.chatId)
            return {};

        const messages: Chat.Message[] = lcMessages.map(lcMsg =>
            Synthesizer.lcToChatMessage(lcMsg, this.chatId!)
        );

        this.context.realtimeAPI.emit<Chat.Event.Message.Added>({
            type: "message:added",
            channel: Chat.Event.getChannel(this.chatId),
            chatId: this.chatId,
            messages
        });

        if(this.fieldValues.write_to_session)
            await InternalChatAPI.messageAdd({ messages });

        return {};
    }
}