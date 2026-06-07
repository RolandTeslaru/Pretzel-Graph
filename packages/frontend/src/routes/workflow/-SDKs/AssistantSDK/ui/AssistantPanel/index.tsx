import { memo, useEffect, useRef } from 'react'
import { Assistant } from '@pretzel-graph/shared/domain'
import { AssistantSDK } from '../../sdk'
import { ScrollArea } from '@pretzel-graph/standard-ui/foundations/scrollArea'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'
import MessageBubble from './MessageBubble'
import PromptInput from './PromptInput'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

interface Props {
    messagesAreaClassname?: string
}

const AssistantPanel: React.FC<Props> = () => {
    const [messageIds, isLoading, lastMessageContent] = AssistantSDK.useStore(s => {
        const lastId = s.messages[s.messages.length - 1]
        const lastMessageContent = lastId ? s.messagesRecord[lastId]?.content : undefined
        return [s.messages, s.isLoading, lastMessageContent] as const
    })

    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messageIds.length, lastMessageContent])

    return (
        <>
            <PromptInput className='absolute z-10 bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-16px)] backdrop-blur-md bg-input/80 shadow-md!' />
            <ScrollArea.Root
                className="flex-1 overflow-hidden h-full relative mask-[linear-gradient(to_bottom,transparent,black_64px,black_calc(100%-64px),transparent)]"
                ref={scrollRef}
            >
                {messageIds.length === 0 && !isLoading && (
                    <SystemIcons.Pretzel className='text-secondary-foreground/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' style={{ width: 48, height: 48 }} />
                )}
                <div className="flex flex-col gap-4 py-2 px-2 mt-auto pb-[130px] pt-13">
                    {isLoading && (
                        <div className="flex justify-center py-2">
                            <Spinner />
                        </div>
                    )}
                    {messageIds.map((id) => (
                        <MessageItem key={id} id={id} />
                    ))}
                </div>
            </ScrollArea.Root>
        </>
    )
}

const MessageItem = memo(({ id }: { id: Assistant.Message.Id }) => {
    const message = AssistantSDK.useStore(s => s.messagesRecord[id])
    if (!message) return null
    return <MessageBubble message={message} />
}, (prev, next) => prev.id === next.id)

export default AssistantPanel
