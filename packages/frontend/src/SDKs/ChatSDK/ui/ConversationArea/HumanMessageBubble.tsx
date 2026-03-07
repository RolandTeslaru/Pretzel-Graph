import { Chat } from '@vx-agent-editor/shared/domain'
import { motion } from 'motion/react'

const HumanMessageBubble = ({ message }: { message: Chat.Message.Human }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="flex flex-col items-end w-full gap-1 mb-2"
    >
      <div className="flex flex-row gap-2 items-end max-w-[85%]">
        <div className="bg-primary/50 border border-primary/80 text-primary-foreground px-2 py-0.5 rounded-xl rounded-br-sm text-sm shadow-sm ring-1 ring-black/5">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default HumanMessageBubble