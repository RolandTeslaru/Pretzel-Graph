import { memo } from 'react'
import { ChatSDK } from '@/SDKs/ChatSDK/sdk'
import { ScrollArea } from '@/vx-ui/foundations/scrollArea'
import HumanMessageBubble from './HumanMessageBubble'
import AIMessageBubble from './AIMessageBubble'
import ToolBubble from './ToolBubble'
import { Chat } from '@vx-agent-editor/shared/domain'

const MessagesArea = () => {
  const messageIds = ChatSDK.useStore(s => s.messages);

  return (
    <ScrollArea.Root className="flex-1 overflow-hidden h-full">
      <div className="flex flex-col gap-4 pb-4 px-2 mt-auto">
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