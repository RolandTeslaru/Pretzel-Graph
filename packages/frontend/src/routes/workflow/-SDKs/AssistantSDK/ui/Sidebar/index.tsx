import { memo, useEffect } from 'react'
import { AssistantSDK } from '../../sdk'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK'
import AssistantPanel from '../ConversationArea'
import Header from './header'
import { AuroraRays } from '@/components/AuroraRays/AuroraRays'
import { Conversation } from '@/components/Conversation'

const AssistantSidebar = () => {
    const isSidebarVisible = AssistantSDK.useStore(s => s.isSidebarVisible)

    useEffect(() => {
        if (isSidebarVisible) {
            StackSDK.actions.push("assistantSidebar", (props) => (
                <StackSDK.Template {...props}>
                    <AssistantSidebarContent />
                </StackSDK.Template>
            ))
        } else {
            StackSDK.actions.pop("assistantSidebar")
        }
    }, [isSidebarVisible])

    return null
}

export default AssistantSidebar

const AssistantSidebarContent = memo(() => {
    return (
        <Conversation.Root accent="LanguageModel">
            <Header />
            <AssistantPanel />
            <div className='pointer-events-none absolute top-0 left-0 w-full h-2/3 z-[-1] -scale-x-100'>
                <AuroraRays />
            </div>
        </Conversation.Root>
    )
})
