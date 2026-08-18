import { ChatSDK } from '../../sdk'
import { Input } from '@pretzel-graph/standard-ui/foundations/input'
import { ContextMenu, Separator } from '@pretzel-graph/standard-ui/foundations'
import type { Chat, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { useParams } from '@tanstack/react-router'

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

    const chats = ChatSDK.useStore(s => s.chats);

    const currentchatId = ChatSDK.useStore(s => s.currentChatId);

    QuerySDK.useQuery(
        ['chats', workflowId],
        () => ChatSDK.actions.chat.listByWorkflow(workflowId),
        { staleTime: Infinity },
    )

    return (
        <div className='flex flex-col h-full overflow-hidden'>
            {/* Search bar */}
            <div className='p-2'>
                <Input placeholder="Search chats..." className='rounded-xl'/>
            </div>

            <Separator className={"w-[calc(100%-16px)] mx-auto"} />

            {/* Scrollable list */}
            <div className='flex flex-col overflow-y-auto flex-1'>
                {Object.values(chats).map((chat) => (
                    <Item key={chat.id} chat={chat} isCurrent={chat.id === currentchatId} />
                ))}
            </div>
        </div>
    )
}

export default ChatList
