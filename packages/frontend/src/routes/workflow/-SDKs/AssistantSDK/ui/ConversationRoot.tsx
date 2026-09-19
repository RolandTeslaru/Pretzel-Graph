import type { ReactNode } from 'react'
import { Conversation } from '@/components/Conversation'
import { AssistantSDK } from '../sdk'

// The assistant's Conversation.Root: running while its run is active, sending blocked until setup is finished.
const ConversationRoot: React.FC<{ children?: ReactNode }> = ({ children }) => {
    const [isRunning, isReady] = AssistantSDK.useStore(s => [s.executionId !== null, s.setupStatus === "ready"] as const)

    return (
        <Conversation.Root
            accent="LanguageModel"
            isRunning={isRunning}
            onStop={() => AssistantSDK.actions.message.stop()}
            isSendBtnDisabled={!isReady}
        >
            {children}
        </Conversation.Root>
    )
}

export default ConversationRoot
