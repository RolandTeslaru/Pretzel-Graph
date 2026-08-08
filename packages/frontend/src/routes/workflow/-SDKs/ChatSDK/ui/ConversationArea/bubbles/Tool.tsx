import { Chat } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { toast } from 'sonner'

const ToolBubble = ({ message }: { message: Chat.Message.Tool }) => {
    const isSuccess = message.data.status === "success";
    const error = !isSuccess ? message.data.error : undefined;

    const copyError = async (e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            await navigator.clipboard.writeText(error ?? "");
            toast.success("Copied error to clipboard");
        } catch {
            toast.error("Failed to copy error");
        }
    };

    const pill = (
        <div className={`
            flex flex-row gap-2 bg-(--port-Tool)/10 border border-(--port-Tool)/20 rounded-lg px-1 h-7
            text-xs text-muted-foreground w-fit max-w-[90%]
            ${error ? "cursor-help" : ""}
        `}>
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
    );

    if (!error)
        return <div className="flex flex-col items-start w-full">{pill}</div>;

    return (
        <div className="flex flex-col items-start w-full">
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    {pill}
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" align="start" className="max-w-[320px] text-left">
                    <div className="flex flex-row gap-1 items-start">
                        <span className="whitespace-pre-wrap font-mono">{error}</span>
                        <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            className="shrink-0 -mr-1.5 text-inherit hover:bg-white/15 dark:hover:bg-black/10"
                            aria-label="Copy error"
                            onClick={copyError}
                        >
                            <SystemIcons.Copy className="size-3" />
                        </Button>
                    </div>
                </Tooltip.Content>
            </Tooltip.Root>
        </div>
    )
}

export default ToolBubble
