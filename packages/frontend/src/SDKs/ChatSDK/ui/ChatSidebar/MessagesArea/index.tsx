import { memo, useCallback, useEffect, useRef } from 'react'
import { ChatSDK } from '@/SDKs/ChatSDK/sdk'
import { ScrollArea } from '@/vx-ui/foundations/scrollArea'
import HumanMessageBubble from './HumanMessageBubble'
import AIMessageBubble from './AIMessageBubble'
import ToolBubble from './ToolBubble'
import { Chat } from '@vx-agent-editor/shared/domain'

const MessagesArea = () => {
  const messageIds = ChatSDK.useStore(s => s.messages);
  const hasMore = ChatSDK.useStore(s => s.hasMore);
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
    if (target.scrollTop < 100 && hasMore && !isLoading) {
      prevScrollHeightRef.current = target.scrollHeight;
      ChatSDK.actions.loadMoreMessages().then(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
          }
        });
      });
    }
  }, [hasMore, isLoading]);

  return (
    <ScrollArea.Root className="flex-1 overflow-hidden h-full" ref={scrollRef} onScroll={handleScroll}>
      <div className="flex flex-col gap-4 pb-4 px-2 mt-auto">
        {isLoading && (
          <div className="flex justify-center py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
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

  if (message.role === "assistant") {
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
