import { Chat } from '@vx-agent-editor/shared/domain'
import { Avatar, AvatarFallback } from '@/vx-ui/foundations/avatar'
import { SystemIcons } from '@/vx-ui/icons'
import { motion } from 'motion/react'

const AIMessageBubble = ({ message }: { message: Chat.Message.Assistant }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="flex flex-col items-start w-full gap-1 mb-4"
    >
      <div className="flex flex-row gap-3 items-end max-w-[85%]">
        <Avatar size="sm" className="mb-1 shrink-0 ring-2 ring-background shadow-sm">
          <AvatarFallback className="bg-primary/10 border border-primary/20 text-primary">
            <SystemIcons.Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        <div className="bg-muted/40 border border-border text-foreground px-4 py-3 rounded-2xl rounded-bl-sm text-sm shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
      {message.tool_calls && message.tool_calls.length > 0 && (
        <div className="flex flex-col gap-1.5 w-full mt-2 pl-11">
          {message.tool_calls.map((toolCall) => (
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