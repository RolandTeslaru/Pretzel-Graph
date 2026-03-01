import { useEffect } from 'react'
import { ChatSDK } from '../../sdk'
import { StackSDK } from '@/SDKs/StackSDK'
import PromptInput from './PromptInput'
import MessagesArea from './MessagesArea'
import { SystemIcons } from '@/vx-ui/icons'
import { Button } from '@/vx-ui/foundations'

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
            <div className='flex flex-row py-2 gap-2 mb-2 px-4 relative border-b border-border'>
                <SystemIcons.MessagesSquare className='text-primary my-auto h-5 w-5'/>
                <h4 className='text-primary font-mono font-semibold text-xl'>
                    Conversation
                </h4>

                <Button size="icon-sm" variant="ghost" className='absolute right-2 top-2'>
                    <SystemIcons.Maximize2 className='text-secondary-foreground'/>
                </Button>
            </div>
            <MessagesArea />
            <div className='mt-auto p-2'>
                <PromptInput />
            </div>
        </div>
    )
}