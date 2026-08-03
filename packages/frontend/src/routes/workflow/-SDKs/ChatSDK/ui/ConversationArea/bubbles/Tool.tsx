import { Chat } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

const ToolBubble = ({ message }: { message: Chat.Message.Tool }) => {
    const isSuccess = message.data.status === "success";

    return (
        <div className="flex flex-col items-start w-full gap-1">
            <div className="flex flex-row gap-2 bg-(--port-Tool)/10 border border-(--port-Tool)/20 rounded-lg px-1 h-7 text-xs text-muted-foreground w-fit max-w-[90%]">
                <div className='h-fit my-auto pl-1'>
                    {isSuccess ? (
                        <SystemIcons.Hammer className="w-4 h-4 text-(--port-Tool-foreground)" />
                    ) : (
                        <SystemIcons.AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    )}
                </div>
                <span className="font-mono h-auto my-auto text-[12px] font-bold truncate" title={message.data.tool_name}>
                    {message.data.tool_name}
                </span>
                <div className="flex-1" />
                {isSuccess ? (
                    <div className='bg-emerald-400/30 my-auto rounded-full h-5 w-5 flex'>
                        <SystemIcons.Check strokeWidth={4} className="w-3.5 h-3.5 m-auto text-emerald-400" />
                    </div>
                ) : (
                    <div className='bg-destructive/30 my-auto rounded-full h-5 w-5 flex'>
                        <SystemIcons.X strokeWidth={4} className="w-3.5 h-3.5 m-auto text-destructive" />
                    </div>
                )}
            </div>
            {(!isSuccess && message.data.error) && (
                <div className="text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 mt-1 max-w-[90%] whitespace-pre-wrap font-mono">
                    {message.data.error}
                </div>
            )}
        </div>
    )
}

export default ToolBubble
