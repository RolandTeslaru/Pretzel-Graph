import { useEffect } from 'react'
import { ChatSDK } from '../../sdk'
import { StackSDK } from '@/SDKs/StackSDK'
import MessagesArea from '../ConversationArea'
import ChatSelect from './ChatSelect'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { Button, DropdownMenu } from '@vx-agent-editor/vx-ui/foundations'


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
            <div className='flex flex-row py-2 gap-2 px-4 absolute backdrop-blur-xl bg-card/70 top-0 left-0 z-10 w-full border-b border-border'>
                <SystemIcons.MessagesSquare className='my-auto h-5 w-5' />
                <h4 className=' text-xl'>
                    Conversation
                </h4>

                <div className='flex flex-row gap-1 ml-auto my-auto h-auto'>
                    <Button size="icon-xs" variant="ghost" className="" onClick={() => ChatSDK.actions.chat.new()}>
                        <SystemIcons.Plus className='text-secondary-foreground' />
                    </Button>
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <Button size="icon-xs" variant="ghost" className=''>
                                <SystemIcons.MessagesSquare className='text-secondary-foreground' />
                            </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end" sideOffset={6} className='w-72'>
                            <ChatSelect />
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                    <Button size="icon-xs" variant="ghost" className=""
                        onClick={() => ChatSDK.actions.ui.openFullscreen()}

                    >
                        <SystemIcons.Maximize2 className='text-secondary-foreground' />
                    </Button>
                </div>
            </div>
            <MessagesArea messagesAreaClassname='pt-[60px]' />
        </div>
    )
}