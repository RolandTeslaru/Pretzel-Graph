import { useMemo, useState } from 'react'
import { AssistantSDK } from '../../sdk'
import { ContextMenu, SearchInput, Separator } from '@pretzel-graph/standard-ui/foundations'
import type { Assistant } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

function formatDate(iso: string): string {
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

const AssistantListItem = ({ assistant, isCurrent }: { assistant: Assistant, isCurrent: boolean }) => {
    const formattedDate = formatDate(assistant.created_at)

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                <div className={`${isCurrent ? 'bg-primary/30 text-primary' : 'group hover:bg-secondary/60 active:bg-secondary/80'} flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors duration-150`}
                    onClick={() => {
                        AssistantSDK.actions.thread.select(assistant.id);
                    }}
                >
                    <div className='flex flex-row min-w-0 flex-1'>
                        <span className='text-sm font-medium text-foreground truncate leading-snug'>
                            {assistant.name}
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
                    onClick={() => AssistantSDK.actions.thread.erase(assistant.id)}
                >
                    Delete
                </ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Root>
    )
}

const AssistantList = () => {
    const assistants = AssistantSDK.useStore(s => s.assistants);
    const currentAssistantId = AssistantSDK.useStore(s => s.currentAssistantId);

    const [query, setQuery] = useState('')

    const matches = useMemo(() => {
        const all = Object.values(assistants)

        if (!query)
            return all

        return all.filter(assistant => assistant.name?.toLowerCase().includes(query))
    }, [assistants, query])

    return (
        <div className='flex flex-col gap-2 h-full overflow-hidden'>
            {/* Search bar */}
            <div className='p-2 pb-0!'>
                <SearchInput
                    placeholder="Search conversations..."
                    className='rounded-xl'
                    onSearch={(value) => setQuery(value.trim().toLowerCase())}
                />
            </div>

            <Separator className={"w-[calc(100%-16px)]! mx-auto"} />

            {/* Scrollable list */}
            <div className='flex flex-col overflow-y-auto flex-1 py-1'>
                {matches.length === 0 ? (
                    <p className='text-xs opacity-60 px-3 py-2'>
                        {query ? 'No matches.' : 'No conversations yet.'}
                    </p>
                ) : matches.map((assistant) => (
                    <AssistantListItem key={assistant.id} assistant={assistant} isCurrent={assistant.id === currentAssistantId} />
                ))}
            </div>
        </div>
    )
}

export default AssistantList
