import { memo } from 'react'
import { Chat } from '@pretzel-graph/shared/domain'
import { AssistantSDK } from '../../sdk'
import { Conversation } from '@/components/Conversation'

const AssistantPanel: React.FC = () => {
    const [messageIds, isLoading, lastMessageContent, toolCallStatus] = AssistantSDK.useStore(s => {
        const lastId = s.messages[s.messages.length - 1]
        const lastMessageContent = lastId ? s.messagesRecord[lastId]?.content : undefined
        return [s.messages, s.isLoading, lastMessageContent, s.toolCallStatus] as const
    })

    return (
        <>
            <Conversation.PromptInput
                onSend={(content) => AssistantSDK.actions.message.send({ content })}
                placeholder="Ask the assistant..."
            >
                <Conversation.SendButton />
            </Conversation.PromptInput>
            <Conversation.Content messageIds={messageIds} isLoading={isLoading} scrollKey={lastMessageContent}>
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
    const message = AssistantSDK.useStore(s => s.messagesRecord[id])

    if (!message)
        return null

    return <Conversation.Message message={message} toolCallStatus={toolCallStatus} />
})

export default AssistantPanel
