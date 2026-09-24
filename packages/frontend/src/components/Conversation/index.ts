import Root from './Root'
import Message from './Message'
import { Header, Title, Subtitle, Actions } from './Header'
import { Content, Empty } from './Content'
import { PromptInput, SendButton } from './PromptInput'
import { ThreadList } from './ThreadList'
import { MessageBubble } from './MessageBubble'
import { useConversation, usePromptInput, type Accent as AccentType } from './context'
import type { Thread as ThreadType } from './ThreadList'

export const Conversation = {
    Root,
    Header,
    Title,
    Subtitle,
    Actions,
    Content,
    Empty,
    Message,
    MessageBubble,
    PromptInput,
    SendButton,
    ThreadList,
    useConversation,
    usePromptInput,
}

export namespace Conversation {
    export type ToolCallStatusRecord = MessageBubble.ToolCallStatusRecord
    export type Accent = AccentType
    export type Thread = ThreadType
}
