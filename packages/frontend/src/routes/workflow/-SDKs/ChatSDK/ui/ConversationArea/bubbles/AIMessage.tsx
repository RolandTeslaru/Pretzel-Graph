import { Chat } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChatSDK } from '@/routes/workflow/-SDKs/ChatSDK/sdk'

const AIMessageBubble = ({ message }: { message: Chat.Message.AI }) => {

  const statuses = ChatSDK.useStore(s => (message.data.tool_calls ?? []).map(tc => s.toolCallStatus[tc.id]))

  const pendingToolCalls = (message.data.tool_calls ?? []).filter((_, i) => !statuses[i])

  const showSpinner = message.content === "" && message.data.isProcessing

  if (!message.content && pendingToolCalls.length === 0)
    return null

  return (
    <div className="flex flex-col items-start w-full gap-1">
      {message.content && 
        <div className="flex flex-row gap-3 items-end max-w-[85%]">
          <div className="bg-muted/40 border border-border text-foreground px-2 py-0.5 rounded-2xl rounded-bl-sm text-sm shadow-sm">
            {showSpinner
              ?
              <Spinner elementClassName='dark:fill-white fill-black!' />
              :
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:my-2 ">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </Markdown>
              </div>
            }
          </div>
        </div>
      }
      {pendingToolCalls.length > 0 && (
        <div className="flex flex-col gap-1.5 w-full">
          {pendingToolCalls.map((toolCall) => (
            <div key={toolCall.id} className="flex flex-row gap-2 text-muted-foregroun">
              <SystemIcons.Terminal className="w-3.5 h-3.5 animate-pulse text-(--port-Tool)" />
              <span className="font-mono text-[11px] font-semibold text-muted-foreground truncate">Calling {toolCall.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AIMessageBubble