import { Button } from "@vx-agent-editor/vx-ui/foundations";
import { SystemIcons } from "@vx-agent-editor/vx-ui/icons";

export const NodeSidebarFooter = () => (
    <div className='absolute z-10 bottom-2 left-2 flex flex-row justify-between bg-card w-[calc(100%-16px)] p-1 rounded-full border border-border shadow-sm shadow-black/10'>
        <Button variant="ghost" size="sm" className="gap-2">
            <SystemIcons.LogIn className='text-secondary-foreground' />
            <p className="text-xs h-auto my-auto mt-1.5">Incoming</p>
        </Button>

        <Button variant="ghost" size={"sm"} className="gap-2">
            <p className="text-xs mt-0.5">Outgoing</p>
            <SystemIcons.LogOut className='text-secondary-foreground' />
        </Button>

    
    </div>
)
