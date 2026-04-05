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
            <div className='flex flex-row py-1 gap-2 px-1 absolute backdrop-blur-xl bg-card/70 top-2 w-[calc(100%-16px)] left-2 z-10 border rounded-full border-border'>
                <div
                    className='flex items-center gap-2 px-3 py-1 rounded-full'
                    style={{ backgroundColor: 'color-mix(in srgb, var(--port-Message) 25%, transparent)' }}
                >
                    <SystemIcons.MessagesSquare className='my-auto h-4 w-4' style={{ color: 'var(--port-Message-foreground)' }} />
                    <h4 className='text-sm font-semibold' style={{ color: 'var(--port-Message-foreground)' }}>
                        Conversation
                    </h4>
                </div>

                <div className='flex flex-row gap-2 ml-auto my-auto h-auto px-1'>
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