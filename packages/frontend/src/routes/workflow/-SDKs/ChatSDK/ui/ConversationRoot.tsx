import type { ReactNode } from 'react'
import { Execution, Validation } from '@pretzel-graph/shared/domain'
import { Conversation } from '@/components/Conversation'
import { ExecutionSDK } from '../../ExecutionSDK/sdk'
import { WorkbenchSDK } from '../../WorkbenchSDK/sdk'

// The chat's Conversation.Root: running while the workflow's execution is active, stop terminates it, sending is blocked while the workflow has issues.
const ConversationRoot: React.FC<{ children?: ReactNode }> = ({ children }) => {
    const isRunning = ExecutionSDK.useStore(s => s.currentExecution ? Execution.isActive(s.currentExecution) : false)
    const hasIssues = WorkbenchSDK.useDocument(d => Validation.workflowHasIssues(d.issues))

    return (
        <Conversation.Root
            accent="Message"
            isRunning={isRunning}
            onStop={() => ExecutionSDK.actions.terminate()}
            isSendBtnDisabled={hasIssues}
        >
            {children}
        </Conversation.Root>
    )
}

export default ConversationRoot
