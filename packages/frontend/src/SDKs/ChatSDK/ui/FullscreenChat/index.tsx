import { ChatSDK } from '../../sdk'
import { Input } from '@vx-agent-editor/vx-ui/foundations/input'
import type { Chat } from '@vx-agent-editor/shared/domain'
import MessagesArea from '../ConversationArea'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a human-friendly relative time string for recent dates or a
 *  localised date string for older ones. */
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

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const FullscreenChat = () => {
    return (
        <div className="flex flex-row gap-10 h-[90vh]">
            <div className='bg-card/80 border border-border/50 rounded-xl shadow-sm shadow-black/10 w-[250px] p-0 backdrop-blur-lg'>
                <ChatList />
            </div>
            <div className='lg:w-[800px] bg-card/80 border border-border/50 rounded-xl shadow-sm shadow-black/10 overflow-hidden backdrop-blur-lg'>
                <ConversationArea />
            </div>
        </div>
    )
}

export default FullscreenChat

const ChatList = () => {
    const chats = ChatSDK.useStore(s => s.chats);

    return (
        <div className='flex flex-col h-full overflow-hidden'>
            {/* Search bar */}
            <div className='p-2 border-b border-border/60 shrink-0'>
                <Input placeholder="Search chats..." />
            </div>

            {/* Scrollable list */}
            <div className='flex flex-col overflow-y-auto flex-1 py-1'>
                {Object.values(chats).map((chat) => (
                    <ChatListItem key={chat.id} chat={chat} />
                ))}
            </div>
        </div>
    )
}

const ChatListItem = ({ chat }: { chat: Chat }) => {
    const formattedDate = formatChatDate(chat.created_at)

    return (
        <div className='group flex items-start gap-2.5 px-3 py-2.5  hover:bg-secondary/60 active:bg-secondary/80 cursor-pointer transition-colors duration-150'
            onClick={() => {
                ChatSDK.actions.chat.load(chat.id);
            }}

        >

            {/* Content */}
            <div className='flex flex-row min-w-0 flex-1'>
                <span className='text-sm font-medium text-foreground truncate leading-snug'>
                    {chat.name}
                </span>
            </div>
            <span className='text-xs my-auto h-auto text-muted-foreground leading-none'>
                {formattedDate}
            </span>
        </div>
    )
}

const ConversationArea = () => {
    return (
        <div className='h-full flex flex-col'>
            <MessagesArea />
        </div>
    )
}