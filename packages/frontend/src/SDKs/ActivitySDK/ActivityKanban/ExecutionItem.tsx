import { Kanban } from '@pretzel-graph/standard-ui/components/kanban'
import type { ComponentType } from 'react'
import { DropdownMenu, Frame, Spinner, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Execution } from '@pretzel-graph/shared/domain'
import type { BaseIconProps } from '@pretzel-graph/standard-ui/icons/baseIcon'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { formatDuration } from '@/routes/workflow/-SDKs/ExecutionSDK/ui/UoWInspector/utils'
import { executionStatusVariants, executionVariants } from './styles'
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'

// Keyed by the enum, so a new igniter fails to compile until it has an icon.
const IgniterIconMap = {
    workbench_manual: SystemIcons.Play,
    workbench_step: SystemIcons.SkipForward,
    workbench_igniter: SystemIcons.Zap,
    sub_workflow: SystemIcons.Layers,
    chat_message: SystemIcons.MessageSquare,
    webhook: SystemIcons.Webhook,
    scheduled: SystemIcons.Clock,
    sdk: SystemIcons.Braces,
} satisfies Record<Execution.Igniter.Variant, ComponentType<BaseIconProps>>


const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Relative while the run is recent, then the date it fell on. */
function formatCreatedAt(iso: string) {
    const at = Date.parse(iso)
    const elapsed = Date.now() - at

    if (elapsed < MINUTE)
        return 'just now'

    if (elapsed < HOUR)
        return `${Math.floor(elapsed / MINUTE)}m ago`

    if (elapsed < DAY)
        return `${Math.floor(elapsed / HOUR)}h ago`

    return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}


const ExecutionItem = ({ execution }: { execution: Execution.Meta }) => {

    const status = execution.status

    const Icon = IgniterIconMap[execution.igniter_variant]

    return (
        <Kanban.Item value={execution.id} asChild>
            <Frame.Panel
                fit
                className={cn(
                    'flex flex-col p-1! relative text-xs h-[60px]',
                    executionVariants({ status: execution.status }),
                )}
            >
                <div className='flex flex-row gap-2 absolute bottom-1 left-2'>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Icon className='size-4 opacity-50' />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p>{`${execution.igniter_variant} igniter`}</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                    <p className='text-muted-foreground'>{formatCreatedAt(execution.created_at)}</p>
                </div>

                {status === "running" && <Spinner className='absolute bottom-1 right-1' elementClassName='fill-sky-400!'/>}

                <div className={cn('absolute top-1 left-1', executionStatusVariants({ status: execution.status }))}>
                    {status}
                </div>



                {/* Duration */}
                {Execution.isSettled(execution) && (
                    <p className='font-mono text-xs text-muted-foreground absolute bottom-1 right-2'>{formatDuration(execution.duration)}</p>
                )}

                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button className='absolute top-0 right-0 p-2 cursor-pointer'>
                            <SystemIcons.Ellipsis className='size-4 ' />
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content side='right' align="start">
                        <DropdownMenu.Item>Copy Id</DropdownMenu.Item>
                        {Execution.isActive(execution) && (
                            <DropdownMenu.Item variant="destructive"
                                onClick={() => {
                                    ExecutionSDK.actions.terminateById(execution.id)
                                }}
                            >Terminate</DropdownMenu.Item>
                        )}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>

            </Frame.Panel>
        </Kanban.Item>
    )
}

export default ExecutionItem
