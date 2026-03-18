import { Chat } from '@vx-agent-editor/shared/domain'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { motion } from 'motion/react'

const ToolBubble = ({ message }: { message: Chat.Message.Tool }) => {
    const isSuccess = message.data.status === "success";

    return (
        <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            className="flex flex-col items-start w-full gap-1 mb-2 pl-14"
        >
            <div className="flex flex-row items-center gap-2 bg-muted/20 border border-border/80 rounded-lg px-3 py-1.5 text-xs text-muted-foreground w-fit max-w-[90%] shadow-sm">
                {isSuccess ? (
                    <SystemIcons.Terminal className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                    <SystemIcons.AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                )}
                <span className="font-mono text-[11px] truncate" title={message.data.tool_name}>
                    {message.data.tool_name}
                </span>
                <div className="flex-1" />
                {isSuccess ? (
                    <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider ml-2">Done</span>
                ) : (
                    <span className="text-destructive text-[9px] uppercase font-bold tracking-wider ml-2">Failed</span>
                )}
            </div>
            {(!isSuccess && message.data.error) && (
                <div className="text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 mt-1 max-w-[90%] whitespace-pre-wrap font-mono">
                    {message.data.error}
                </div>
            )}
        </motion.div>
    )
}

export default ToolBubble
