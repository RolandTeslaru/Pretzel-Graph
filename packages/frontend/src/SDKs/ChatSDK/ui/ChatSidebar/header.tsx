import { ChatSDK } from '../../sdk'
import ChatSelect from './ChatSelect'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { Button, DropdownMenu } from '@vx-agent-editor/vx-ui/foundations'

const ChatSidebarHeader = () => {

    const currentChatName = ChatSDK.useStore(s => s.chats[s.currentChatId]?.name)

    return (
        <div className='flex flex-row py-1 gap-2 px-1 absolute bg-card-float top-2 w-[calc(100%-16px)] left-2 z-10 border rounded-full border-border shadow-sm shadow-black/10'>
            <div
                className='flex items-center gap-2 p-1.5 rounded-full'
                style={{ backgroundColor: 'color-mix(in srgb, var(--port-Message) 25%, transparent)' }}
            >
                <SystemIcons.MessagesSquare className='my-auto h-4 w-4' style={{ color: 'var(--port-Message-foreground)' }} />
            </div>
            <p className='text-xs h-auto my-auto truncate'>{currentChatName}</p>
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
    )
}

export default ChatSidebarHeader
