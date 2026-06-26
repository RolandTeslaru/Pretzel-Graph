import { Assistant } from '@pretzel-graph/shared/domain'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'

interface Props {
    message: Assistant.Message
}

const MessageBubble: React.FC<Props> = ({ message }) => {
    const isHuman = message.role === "human"
    const isProcessing = message.role === "ai" && message.data.isProcessing

    return (
        <div className={`flex ${isHuman ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    isHuman ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                }`}
            >
                {message.content}
                {isProcessing && !message.content && <Spinner className='size-3' />}
            </div>
        </div>
    )
}

export default MessageBubble
