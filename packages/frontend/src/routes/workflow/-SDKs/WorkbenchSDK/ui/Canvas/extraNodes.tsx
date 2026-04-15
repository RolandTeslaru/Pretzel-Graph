import type { NodeProps } from '@xyflow/react'
import type { WorkbenchSDK } from '../../sdk'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { memo } from 'react'
import { motion } from 'motion/react'
import { Tooltip } from '@vx-agent-editor/vx-ui/foundations'
import type { Validation } from '@vx-agent-editor/shared/domain'

export const ProblematicCycleSelectionNode = memo(({ data }: NodeProps<WorkbenchSDK.CycleSelectionNodeDriver>) => {
    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, duration: 0.2, ease: 'easeOut' }}
            style={{ width: data.width, height: data.height }}
            className="rounded-4xl relative border-2 p-1 border-destructive/40 bg-destructive/10  origin-center"
        >
            <SystemIcons.AlertTriangle className="w-[15%] h-[15%] text-destructive/50 absolute top-1/2 left-1/2 -translate-1/2" />
            <SystemIcons.AlertTriangle className="w-[15%] h-[15%] text-destructive/50 animate-ping absolute top-1/2 left-1/2 -translate-1/2" />
        
            
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    <SystemIcons.Info className='absolute top-2 right-2 text-destructive animate-pulse' size={40}/>
                </Tooltip.Trigger>
                <Tooltip.Content>
                    <TooltipContent issue={data.issue} />
                </Tooltip.Content>
            </Tooltip.Root>
        </motion.div>
    )
})


export const TooltipContent = ({ issue }: { issue: Validation.Issue.Cycle}) => {
    return (
        <div className='text-sm max-w-xs flex flex-col gap-1'>
            <div>
                <p className="text-sm dark:text-black text-md text-white font-semibold mb-1">Unsafe Cycle Detected!</p>
            </div>
            { issue.type === "cycle_without_route_branching_node" && (
                <>
                    
                    <p>This cycle has no exit condition.</p>
                    <p className='flex flex-wrap items-center gap-x-1'>
                        Add a branching node like
                        <span className='font-semibold inline-flex items-center gap-1'>
                            <SystemIcons.Split size={15} strokeWidth={3}/>
                            If Else,
                        </span>
                        <span className='font-semibold inline-flex items-center gap-1'>
                            <SystemIcons.Option size={15} strokeWidth={3}/>
                            Switch,
                        </span>
                        <span className='font-semibold inline-flex items-center gap-1'>
                            <SystemIcons.ListTree size={15} strokeWidth={3}/>
                            Router
                        </span>
                        to break out of the loop.
                    </p>
                </>
            )}
        </div>
    )
}
