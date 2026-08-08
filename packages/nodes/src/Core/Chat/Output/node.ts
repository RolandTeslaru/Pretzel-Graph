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

        // chat_id is a user-editable field, so the backend owns both the ownership check and
        // the broadcast — this node never publishes to a chat channel directly.
        await InternalChatAPI.messageAdd(
            this.context.internalAPI,
            chatId,
            messages,
            { persist: this.fieldValues.write_to_session, broadcast: true },
        );

        return {};
    }
}
