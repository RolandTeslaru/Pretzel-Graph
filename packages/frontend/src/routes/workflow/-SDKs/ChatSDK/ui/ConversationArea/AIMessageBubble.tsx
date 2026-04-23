import { Chat } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { motion } from 'motion/react'
import { Spinner } from '@pretzel-graph/standard-ui/foundations'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const AIMessageBubble = ({ message }: { message: Chat.Message.AI }) => {

  const showSpinner = message.content === "" && message.data.isProcessing

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="flex flex-col items-start w-full gap-1"
    >
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
      {message.data.tool_calls && message.data.tool_calls.length > 0 && (
        <div className="flex flex-col gap-1.5 w-full">
          {message.data.tool_calls.map((toolCall) => (
            <div key={toolCall.id} className="flex flex-row gap-2 text-muted-foregroun">
              <SystemIcons.Terminal className="w-3.5 h-3.5 animate-pulse text-(--port-Tool)" />
              <span className="font-mono text-[12px] font-semibold text-muted-foreground truncate">Calling {toolCall.name}...</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default AIMessageBubble