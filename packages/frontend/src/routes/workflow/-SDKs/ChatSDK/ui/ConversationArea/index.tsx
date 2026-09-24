import { memo } from 'react'
import { ChatSDK } from '@/routes/workflow/-SDKs/ChatSDK/sdk'
import { Conversation } from '@/components/Conversation'
import { Chat } from '@pretzel-graph/shared/domain'
import PromptInput from './PromptInput'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { NodeBadge } from '@/components/NodeBadge'


const ConversationArea: React.FC = () => {

    const hasChatOutputNode = WorkbenchSDK.useDocument(d => {
        return Object.values(d.data.nodes).some(node => node.blueprintId === "Core.Chat.Output");
    })

    const [messageIds, isLoading, lastMessageContent, toolCallStatus] = ChatSDK.useStore(s => {

        const lastId = s.messages[s.messages.length - 1];
        const lastMessageContent = lastId ? s.messagesRecord[lastId]?.content : undefined;

        return [s.messages, s.isLoading, lastMessageContent, s.toolCallStatus] as const
    })

    return (
        <>
            <PromptInput />
            <Conversation.Content
                messageIds={messageIds}
                isLoading={isLoading}
                scrollKey={lastMessageContent}
                empty={!hasChatOutputNode && (
                    <Conversation.Empty>
                        Add a <NodeBadge icon="MessagesSquare" label="Chat Output" accent="port-Message" /> node to view responses.
                    </Conversation.Empty>
                )}
            >
                {(id) => <MessageItem id={id} toolCallStatus={toolCallStatus} />}
            </Conversation.Content>
        </>
    )
}

interface MessageItemProps {
    id: Chat.Message.Id
    toolCallStatus: Conversation.ToolCallStatusRecord
}

const MessageItem = memo(({ id, toolCallStatus }: MessageItemProps) => {
    const message = ChatSDK.useStore(s => s.messagesRecord[id]);

    if (!message)
        return null;

    return <Conversation.Message message={message} toolCallStatus={toolCallStatus} />
})

export default ConversationArea
