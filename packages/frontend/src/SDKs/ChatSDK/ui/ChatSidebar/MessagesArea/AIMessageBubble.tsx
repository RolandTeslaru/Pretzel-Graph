import { Chat } from '@vx-agent-editor/shared/domain'
import { SystemIcons } from '@/vx-ui/icons'
import { motion } from 'motion/react'
import { Spinner } from '@/vx-ui/foundations'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const AIMessageBubble = ({ message }: { message: Chat.Message.Assistant }) => {

  const showSpinner = message.content === "" && message.data.isProcessing

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="flex flex-col items-start w-full gap-1 mb-2"
    >
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
      {message.data.tool_calls && message.data.tool_calls.length > 0 && (
        <div className="flex flex-col gap-1.5 w-full mt-2 pl-11">
          {message.data.tool_calls.map((toolCall) => (
            <div key={toolCall.id} className="flex flex-row items-center gap-2 bg-muted/30 border border-border/50 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground w-fit max-w-full">
              <SystemIcons.Terminal className="w-3.5 h-3.5 animate-pulse text-amber-500" />
              <span className="font-mono text-[11px] truncate">Calling {toolCall.name}...</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default AIMessageBubble