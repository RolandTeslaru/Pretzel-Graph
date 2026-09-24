import type { Chat } from '@pretzel-graph/shared/domain'
import { MessageBubble } from './MessageBubble'

interface Props {
    message:        Chat.Message
    toolCallStatus: MessageBubble.ToolCallStatusRecord
}

// Renders a message with the bubble for its role.
const Message: React.FC<Props> = ({ message, toolCallStatus }) => {
    switch (message.role) {
        case "human": return <MessageBubble.Human message={message} />
        case "ai":    return <MessageBubble.AI message={message} toolCallStatus={toolCallStatus} />
        case "tool":  return <MessageBubble.Tool message={message} />
        default:      return null
    }
}

export default Message
