import { memo, useCallback, useEffect, useRef } from 'react'
import { ChatSDK } from '@/SDKs/ChatSDK/sdk'
import { ScrollArea } from '@/vx-ui/foundations/scrollArea'
import HumanMessageBubble from './HumanMessageBubble'
import AIMessageBubble from './AIMessageBubble'
import ToolBubble from './ToolBubble'
import { Chat } from '@vx-agent-editor/shared/domain'
import PromptInput from './PromptInput'
import { Spinner } from '@/vx-ui/foundations'

interface Props {
  messagesAreaClassname?: string
}

const MessagesArea: React.FC<Props> = ({ messagesAreaClassname}) => {
  const messageIds = ChatSDK.useStore(s => s.messages);
  const isLoading = ChatSDK.useStore(s => s.isLoading);
  const lastMessageContent = ChatSDK.useStore(s => {
    const lastId = s.messages[s.messages.length - 1];
    return lastId ? s.messagesRecord[lastId]?.content : undefined;
  });
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
    <ScrollArea.Root className="flex-1 overflow-hidden h-full relative" ref={scrollRef} onScroll={handleScroll}>
      <PromptInput className='absolute bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-16px)] backdrop-blur-md bg-input/80 shadow-md! '/>
      <div className={"flex flex-col gap-4 py-2 px-2 mt-auto pb-[116px] " + messagesAreaClassname }>
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
  )
}

const MessageItem = memo(({ id }: { id: Chat.Message.Id }) => {
  const message = ChatSDK.useStore(s => s.messagesRecord[id]);

  if (!message) return null;

  if (message.role === "user") {
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

export default MessagesArea
