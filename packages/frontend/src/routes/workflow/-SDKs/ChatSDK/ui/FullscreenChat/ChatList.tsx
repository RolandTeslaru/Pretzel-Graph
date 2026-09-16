import { useMemo, useState } from 'react'
import { ChatSDK } from '../../sdk'
import { ContextMenu, SearchInput, Separator, Skeleton } from '@pretzel-graph/standard-ui/foundations'
import type { Chat, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { useParams } from '@tanstack/react-router'

const CHAT_SKELETONS = ['w-32', 'w-24', 'w-36', 'w-28', 'w-20', 'w-32']

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

const Item = ({ chat, isCurrent }: { chat: Chat, isCurrent: boolean }) => {
    const formattedDate = formatChatDate(chat.created_at)

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                <div className={`${isCurrent ? 'bg-[var(--port-Message)]/20 text-primary' : 'group hover:bg-secondary active:bg-secondary/80'} flex items-start gap-2.5 px-3 py-2.5 cursor-pointer `}
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
    const { workflowid } = useParams({ from: '/workflow/$workflowid' })
    const workflowId = workflowid as Workflow.Id

    const [currentChatId, [request]] = ChatSDK.useWith((s) => s.currentChatId, [ChatSDK.query.list(workflowId)])

    const [query, setQuery] = useState('')

    const matches = useMemo(() => {
        const all = request.data ?? []

        if (!query)
            return all

        return all.filter(chat => chat.name?.toLowerCase().includes(query))
    }, [request.data, query])

    return (
        <div className='flex flex-col gap-2 h-full overflow-hidden'>
            {/* Search bar */}
            <div className='p-2 pb-0!'>
                <SearchInput
                    placeholder="Search chats..."
                    className='rounded-xl'
                    onSearch={(value) => setQuery(value.trim().toLowerCase())}
                />
            </div>

            <Separator className={"w-[calc(100%-16px)]! mx-auto"} />

            {/* Scrollable list */}
            <div className='flex flex-col overflow-y-auto flex-1'>
                {request.isPending ? (
                    <ChatListSkeleton />
                ) : request.isError ? (
                    <p className='text-xs text-destructive px-3 py-2'>
                        Could not load chats.
                    </p>
                ) : matches.length === 0 ? (
                    <p className='text-xs opacity-60 px-3 py-2'>
                        {query ? 'No matches.' : 'No chats yet.'}
                    </p>
                ) : matches.map((chat) => (
                    <Item key={chat.id} chat={chat} isCurrent={chat.id === currentChatId} />
                ))}
            </div>
        </div>
    )
}

const ChatListSkeleton = () => (
    <>
        {CHAT_SKELETONS.map((width, index) => (
            <div className='flex items-center gap-2.5 px-3 py-2.5' key={index}>
                <Skeleton className={`h-3.5 ${width}`} />
                <Skeleton className='h-3 w-10 ml-auto' />
            </div>
        ))}
    </>
)

export default ChatList
