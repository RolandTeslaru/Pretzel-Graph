import { useMemo, useState } from 'react'
import { ContextMenu, SearchInput, Separator, Skeleton } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'

const SKELETON_WIDTHS = ['w-32', 'w-24', 'w-36', 'w-28', 'w-20', 'w-32']

export interface Thread<T_Id extends string = string> {
    id:         T_Id
    name?:      string | null
    created_at: string
}

interface Props<T_Id extends string> {
    threads:            readonly Thread<T_Id>[]
    currentId?:         T_Id | null
    onSelect:           (id: T_Id) => void
    onErase:            (id: T_Id) => void
    isPending?:         boolean
    isError?:           boolean
    searchPlaceholder?: string
    emptyLabel?:        string
    errorLabel?:        string
}

export function ThreadList<T_Id extends string>({
    threads,
    currentId,
    onSelect,
    onErase,
    isPending = false,
    isError = false,
    searchPlaceholder = "Search conversations...",
    emptyLabel = "No conversations yet.",
    errorLabel = "Could not load conversations.",
}: Props<T_Id>) {
    const [query, setQuery] = useState('')

    const matches = useMemo(() => {
        if (!query)
            return threads

        return threads.filter(thread => thread.name?.toLowerCase().includes(query))
    }, [threads, query])

    return (
        <div className='flex flex-col gap-2 h-full overflow-hidden'>
            <div className='p-2 pb-0!'>
                <SearchInput
                    placeholder={searchPlaceholder}
                    className='rounded-xl'
                    onSearch={(value) => setQuery(value.trim().toLowerCase())}
                />
            </div>

            <Separator className='w-[calc(100%-16px)]! mx-auto' />

            <div className='flex flex-col overflow-y-auto flex-1'>
                {isPending ? (
                    <ThreadListSkeleton />
                ) : isError ? (
                    <p className='text-xs text-destructive px-3 py-2'>{errorLabel}</p>
                ) : matches.length === 0 ? (
                    <p className='text-xs opacity-60 px-3 py-2'>{query ? 'No matches.' : emptyLabel}</p>
                ) : matches.map(thread => (
                    <ThreadItem
                        key={thread.id}
                        thread={thread}
                        isCurrent={thread.id === currentId}
                        onSelect={() => onSelect(thread.id)}
                        onErase={() => onErase(thread.id)}
                    />
                ))}
            </div>
        </div>
    )
}

interface ItemProps {
    thread:    Thread
    isCurrent: boolean
    onSelect:  () => void
    onErase:   () => void
}

const ThreadItem: React.FC<ItemProps> = ({ thread, isCurrent, onSelect, onErase }) => (
    <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
            <div
                className={cn(
                    'flex items-start gap-2.5 px-3 py-2.5 cursor-pointer',
                    isCurrent ? 'bg-(--conversation-accent)/20 text-primary' : 'group hover:bg-secondary active:bg-secondary/80',
                )}
                onClick={onSelect}
            >
                <div className='flex flex-row min-w-0 flex-1'>
                    <span className='text-sm font-medium text-foreground truncate leading-snug'>
                        {thread.name}
                    </span>
                </div>
                <span className='text-xs my-auto h-auto text-muted-foreground leading-none'>
                    {formatThreadDate(thread.created_at)}
                </span>
            </div>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
            <ContextMenu.Item variant="destructive" icon={<SystemIcons.Trash />} onClick={onErase}>
                Delete
            </ContextMenu.Item>
        </ContextMenu.Content>
    </ContextMenu.Root>
)

const ThreadListSkeleton = () => (
    <>
        {SKELETON_WIDTHS.map((width, index) => (
            <div className='flex items-center gap-2.5 px-3 py-2.5' key={index}>
                <Skeleton className={`h-3.5 ${width}`} />
                <Skeleton className='h-3 w-10 ml-auto' />
            </div>
        ))}
    </>
)

function formatThreadDate(iso: string): string {
    const date = new Date(iso)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
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
