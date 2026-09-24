import { memo, useEffect } from 'react'
import { Chat } from '@pretzel-graph/shared/domain'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AssistantSDK } from '../../sdk'
import { Conversation } from '@/components/Conversation'

const AssistantPanel: React.FC = () => {
    const [messageIds, isLoading, lastMessageContent, toolCallStatus, setupStatus] = AssistantSDK.useStore(s => {
        const lastId = s.messages[s.messages.length - 1]
        const lastMessageContent = lastId ? s.messagesRecord[lastId]?.content : undefined
        return [s.messages, s.isLoading, lastMessageContent, s.toolCallStatus, s.setupStatus] as const
    })

    useEffect(() => {
        void AssistantSDK.actions.setup.check()
    }, [])

    const isIncomplete = setupStatus === "incomplete"

    return (
        <>
            <Conversation.PromptInput
                onSend={(content) => AssistantSDK.actions.message.send({ content })}
                placeholder={isIncomplete ? undefined : "Ask the assistant..."}
                notice={isIncomplete && <FinishSetupButton />}
            >
                <Conversation.SendButton />
            </Conversation.PromptInput>
            <Conversation.Content messageIds={messageIds} isLoading={isLoading} scrollKey={lastMessageContent}>
                {(id) => <MessageItem id={id} toolCallStatus={toolCallStatus} />}
            </Conversation.Content>
        </>
    )
}

const FinishSetupButton = () => (
    <Button size="sm" variant="language-model" onClick={() => AssistantSDK.actions.setup.open()}>
        Finish setting up your assistant
        <SystemIcons.ArrowRight />
    </Button>
)

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
