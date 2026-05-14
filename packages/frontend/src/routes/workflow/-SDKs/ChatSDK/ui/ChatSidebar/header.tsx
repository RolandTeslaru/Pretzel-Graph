import { ChatSDK } from '../../sdk'
import ChatSelect from './ChatSelect'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button, DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { AnimatePresence, motion } from 'framer-motion'

const ChatSidebarHeader = () => {

    const currentChatName = ChatSDK.useStore(s => s.chats[s.currentChatId]?.name)

    return (
        <div className='flex flex-row gap-2 absolute top-2 w-[calc(100%-16px)] left-2 z-10 '>
            {/* Chat Icon */}
            <div
                className='flex items-center gap-2 px-2 py-1 rounded-full'
                style={{ backgroundColor: 'color-mix(in srgb, var(--port-Message) 25%, transparent)' }}
            >
                <SystemIcons.MessagesSquare className='my-auto h-4 w-4' style={{ color: 'var(--port-Message-foreground)' }} />
                <AnimatePresence>
                    {!currentChatName && (
                        <motion.h4
                            className='text-sm h-auto my-auto truncate font-semibold pr-1'
                            style={{ color: 'var(--port-Message-foreground)' }}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                        >
                            Conversation
                        </motion.h4>
                    )}
                </AnimatePresence>
            </div>
            <p className='text-xs h-auto my-auto truncate font-medium'>{currentChatName}</p>
            <div className='flex flex-row gap-2 border border-border bg-card rounded-full ml-auto my-auto h-auto p-0.5 shadow-md shadow-black/10'>
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
