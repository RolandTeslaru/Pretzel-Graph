import { useEffect } from 'react'
import { AssistantSDK } from '../../sdk'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK'
import AssistantPanel from '../ConversationArea'
import ConversationRoot from '../ConversationRoot'
import Header from './header'

const AssistantSidebar = () => {
    const isSidebarVisible = AssistantSDK.useStore(s => s.isSidebarVisible)

    useEffect(() => {
        if (isSidebarVisible) {
            StackSDK.actions.push("assistantSidebar", (props) => (
                <StackSDK.Template {...props}>
                    <ConversationRoot>
                        <Header />
                        <AssistantPanel />
                    </ConversationRoot>
                </StackSDK.Template>
            ))
        } else {
            StackSDK.actions.pop("assistantSidebar")
        }
    }, [isSidebarVisible])

    return null
}

export default AssistantSidebar
