import { memo, useCallback, useEffect, useRef } from 'react'
import { ChatSDK } from '@/routes/workflow/-SDKs/ChatSDK/sdk'
import { ScrollArea } from '@pretzel-graph/standard-ui/foundations/scrollArea'
import { MessageBubble } from '@/components/AI/MessageBubble'
import { Chat } from '@pretzel-graph/shared/domain'
import PromptInput from './PromptInput'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { NodeBadge } from '@/components/NodeBadge'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'



const ConversationArea: React.FC = () => {

  const hasChatOutputNode = WorkbenchSDK.useDocument(d => {
        return Object.values(d.data.nodes).some(node => node.blueprintId === "Core.Chat.Output");
    })
    



  const [messageIds, isLoading, lastMessageContent, toolCallStatus] = ChatSDK.useStore(s => {

    const lastId = s.messages[s.messages.length - 1];
    const lastMessageContent = lastId ? s.messagesRecord[lastId]?.content : undefined;

    return [s.messages, s.isLoading, lastMessageContent, s.toolCallStatus] as const
  })

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);

  // Scroll to bottom when a new message is added or content streams in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messageIds.length, lastMessageContent]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop < 100 && !isLoading) {
      prevScrollHeightRef.current = target.scrollHeight;
    }
  }, [isLoading]);

  return (
    <>
      <PromptInput className='absolute z-10 bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-16px)] backdrop-blur-md bg-input/80 shadow-md! '/>
      <ScrollArea.Root className={`
        flex-1 overflow-hidden h-full relative
        mask-[linear-gradient(to_bottom,transparent,black_74px,black_calc(100%-74px),transparent)]
      `} ref={scrollRef} onScroll={handleScroll}>
        
        {/* Chat Output Node message */}
        {!hasChatOutputNode && messageIds.length === 0 && (
            <p className='absolute left-1/2 -translate-x-1/2 text-nowrap top-1/2 -translate-y-1/2 text-xs text-foreground flex items-center gap-1 opacity-50'>
                Add a <NodeBadge icon="MessagesSquare" label="Chat Output" accent="port-Message" /> node to view responses.
            </p>
        )}

        {/* Watermark */}
        {messageIds.length === 0 && !isLoading && (
            <SystemIcons.Pretzel className='text-secondary-foreground/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' style={{ width: 48, height: 48 }} />
        )}
        <div className={"flex flex-col gap-4 py-2 px-2 mt-auto pb-[130px] pt-13" }>
          {isLoading && (
            <div className="flex justify-center py-2">
              <Spinner/>
            </div>
          )}
          {messageIds.map((id, index) => (
              <MessageItem key={index} id={id} toolCallStatus={toolCallStatus} />
          ))}
        </div>
      </ScrollArea.Root>
    </>
  )
}

interface MessageItemProps {
  id: Chat.Message.Id
  toolCallStatus: MessageBubble.ToolCallStatusRecord
}

const MessageItem = memo(({ id, toolCallStatus }: MessageItemProps) => {
  const message = ChatSDK.useStore(s => s.messagesRecord[id]);

  if (!message) return null;

  if (message.role === "human")
    return <MessageBubble.Human message={message} />;

  if (message.role === "ai")
    return <MessageBubble.AI message={message} toolCallStatus={toolCallStatus} />;

  if (message.role === "tool")
    return <MessageBubble.ToolCall message={message} />;

  return null;
})

export default ConversationArea
