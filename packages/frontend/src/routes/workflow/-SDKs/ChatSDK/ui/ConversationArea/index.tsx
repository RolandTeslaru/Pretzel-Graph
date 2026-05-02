import { memo, useCallback, useEffect, useRef } from 'react'
import { ChatSDK } from '@/routes/workflow/-SDKs/ChatSDK/sdk'
import { ScrollArea } from '@pretzel-graph/standard-ui/foundations/scrollArea'
import HumanMessageBubble from './HumanMessageBubble'
import AIMessageBubble from './AIMessageBubble'
import ToolBubble from './ToolBubble'
import { Chat } from '@pretzel-graph/shared/domain'
import PromptInput from './PromptInput'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { NodeBadge } from '@/components/NodeBadge'

interface Props {
  messagesAreaClassname?: string
}

const ConversationArea: React.FC<Props> = ({ messagesAreaClassname}) => {

  const hasChatOutputNode = WorkbenchSDK.useStore(s => {
        return Object.values(s.workflow.data.nodes).some(node => node.blueprintId === "Core.Chat.Output");
    })
    

  const [messageIds, isLoading, lastMessageContent] = ChatSDK.useStore(s => {

    const lastId = s.messages[s.messages.length - 1];
    const lastMessageContent = lastId ? s.messagesRecord[lastId]?.content : undefined;

    return [s.messages, s.isLoading, lastMessageContent]
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
      <ScrollArea.Root className="flex-1 overflow-hidden h-full relative mask-[linear-gradient(to_bottom,transparent,black_64px,black_calc(100%-64px),transparent)]" ref={scrollRef} onScroll={handleScroll}>
        {!hasChatOutputNode && (
            <p className='absolute left-1/2 -translate-x-1/2 text-nowrap top-1/2 -translate-y-1/2 text-xs text-foreground flex items-center gap-1 opacity-50'>
                Add a <NodeBadge icon="MessagesSquare" label="Chat Output" accent="port-Message" /> node to view responses.
            </p>
        )}
        <div className={"flex flex-col gap-4 py-2 px-2 mt-auto pb-[130px] pt-13" }>
          {isLoading && (
            <div className="flex justify-center py-2">
              <Spinner/>
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

const MessageItem = memo(({ id }: { id: Chat.Message.Id }) => {
  const message = ChatSDK.useStore(s => s.messagesRecord[id]);

  if (!message) return null;

  if (message.role === "human") {
    return <HumanMessageBubble message={message} />;
  }

  if (message.role === "ai") {
    return <AIMessageBubble message={message} />;
  }

  if (message.role === "tool") {
    return <ToolBubble message={message} />;
  }

  return null;
}, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id;
})

export default ConversationArea
