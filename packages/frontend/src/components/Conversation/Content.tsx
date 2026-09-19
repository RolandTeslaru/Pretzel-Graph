import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { ScrollArea } from '@pretzel-graph/standard-ui/foundations/scrollArea'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Chat } from '@pretzel-graph/shared/domain'

interface ContentProps {
    messageIds: readonly Chat.Message.Id[]
    isLoading:  boolean
    // Changes whenever the view should follow the latest message, e.g. its streamed content.
    scrollKey?: unknown
    // Shown over the list, on top of the watermark, while there are no messages.
    empty?:     ReactNode
    children:   (id: Chat.Message.Id) => ReactNode
}

export const Content: React.FC<ContentProps> = ({ messageIds, isLoading, scrollKey, empty, children }) => {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current)
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [messageIds.length, scrollKey])

    const isEmpty = messageIds.length === 0

    return (
        <ScrollArea.Root
            ref={scrollRef}
            className='flex-1 overflow-hidden h-full relative mask-[linear-gradient(to_bottom,transparent,black_74px,black_calc(100%-74px),transparent)]'
        >
            {isEmpty && empty}

            {isEmpty && !isLoading && (
                <SystemIcons.Pretzel className='text-secondary-foreground/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' style={{ width: 48, height: 48 }} />
            )}

            <div className='flex flex-col gap-4 py-2 px-2 mt-auto pb-[130px] pt-13'>
                {isLoading && (
                    <div className='flex justify-center py-2'>
                        <Spinner />
                    </div>
                )}
                {messageIds.map(id => (
                    <Fragment key={id}>{children(id)}</Fragment>
                ))}
            </div>
        </ScrollArea.Root>
    )
}

export const Empty: React.FC<{ children?: ReactNode }> = ({ children }) => (
    <p className='absolute left-1/2 -translate-x-1/2 text-nowrap top-1/2 -translate-y-1/2 text-xs text-foreground flex items-center gap-1 opacity-50'>
        {children}
    </p>
)
