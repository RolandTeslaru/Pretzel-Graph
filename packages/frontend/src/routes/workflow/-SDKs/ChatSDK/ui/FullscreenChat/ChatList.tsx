import { ChatSDK } from '../../sdk'
import { Input } from '@pretzel-graph/standard-ui/foundations/input'
import { ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import type { Chat } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

function formatChatDate(iso: string): string {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    if (diffSec < 60) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDay === 1) return 'Yesterday'
    if (diffDay < 7) return `${diffDay}d ago`

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
}

const ChatListItem = ({ chat, isCurrent }: { chat: Chat, isCurrent: boolean }) => {
    const formattedDate = formatChatDate(chat.created_at)

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                <div className={`${isCurrent ? 'bg-primary/30 text-primary' : 'group hover:bg-secondary/60 active:bg-secondary/80'} flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors duration-150`}
                    onClick={() => {
                        ChatSDK.actions.chat.load(chat.id);
                    }}
                >
                    <div className='flex flex-row min-w-0 flex-1'>
                        <span className='text-sm font-medium text-foreground truncate leading-snug'>
                            {chat.name}
                        </span>
                    </div>
                    <span className='text-xs my-auto h-auto text-muted-foreground leading-none'>
                        {formattedDate}
                    </span>
                </div>
            </ContextMenu.Trigger>
            <ContextMenu.Content>
                <ContextMenu.Item
                    variant="destructive"
                    icon={<SystemIcons.Trash />}
                    onClick={() => ChatSDK.actions.chat.erase(chat.id)}
                >
                    Delete
                </ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Root>
    )
}

const ChatList = () => {
    const chats = ChatSDK.useStore(s => s.chats);

    const currentchatId = ChatSDK.useStore(s => s.currentChatId);

    return (
        <div className='flex flex-col h-full overflow-hidden'>
            {/* Search bar */}
            <div className='p-2 border-b border-border/60 shrink-0'>
                <Input placeholder="Search chats..." className='rounded-xl'/>
            </div>

            {/* Scrollable list */}
            <div className='flex flex-col overflow-y-auto flex-1 py-1'>
                {Object.values(chats).map((chat) => (
                    <ChatListItem key={chat.id} chat={chat} isCurrent={chat.id === currentchatId} />
                ))}
            </div>
        </div>
    )
}

export default ChatList
