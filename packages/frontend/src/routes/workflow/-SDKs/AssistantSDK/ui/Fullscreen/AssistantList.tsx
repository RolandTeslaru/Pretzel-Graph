import { AssistantSDK } from '../../sdk'
import { Conversation } from '@/components/Conversation'

const AssistantList = () => {
    const assistants = AssistantSDK.useStore(s => s.assistants)
    const currentAssistantId = AssistantSDK.useStore(s => s.currentAssistantId)

    return (
        <Conversation.ThreadList
            threads={Object.values(assistants)}
            currentId={currentAssistantId}
            onSelect={(assistantId) => AssistantSDK.actions.thread.select(assistantId)}
            onErase={(assistantId) => AssistantSDK.actions.thread.erase(assistantId)}
        />
    )
}

export default AssistantList
