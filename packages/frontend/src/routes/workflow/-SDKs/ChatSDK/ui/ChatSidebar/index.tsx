import { useEffect } from 'react'
import { ChatSDK } from '../../sdk'
import { StackSDK } from '@/routes/workflow/-SDKs/StackSDK'
import ConversationArea from '../ConversationArea'
import Header from './header'


const ChatSidebar = () => {
    const isSidebarVisible = ChatSDK.useStore(s => s.isSidebarVisible);

    useEffect(() => {
        if (isSidebarVisible) {
            StackSDK.actions.push("chatSidebar", (props) => (
                <StackSDK.Template {...props}>
                    <ChatSidebarContent />
                </StackSDK.Template>
            ))
        } else {
            StackSDK.actions.pop("chatSidebar")
        }
    }, [isSidebarVisible])

    return null
}

export default ChatSidebar


const ChatSidebarContent = () => {

    return (
        <div className='flex flex-col h-full'>
            <Header />
            <ConversationArea/>
        </div>
    )
}