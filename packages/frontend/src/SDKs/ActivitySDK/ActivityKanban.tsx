import { Kanban } from '@pretzel-graph/standard-ui/components/kanban'
import React, { useMemo, type ComponentType } from 'react'
import { ActivitySDK } from './sdk'
import { Badge, Button, DropdownMenu, Frame, Spinner, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Execution, Library, Workflow } from '@pretzel-graph/shared/domain'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import type { BaseIconProps } from '@pretzel-graph/standard-ui/icons/baseIcon'
import { cva } from 'class-variance-authority'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { formatDuration } from '@/routes/workflow/-SDKs/ExecutionSDK/ui/UoWInspector/utils'

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


function iconColor(workflow: Library.WorkflowMeta) {
    const token = workflow.icon_color ?? workflow.accent

    return token ? `var(--${token})` : "var(--primary--foreground)"
}


// Written out rather than built from a token name: Tailwind only emits an
// arbitrary property it can read literally in the source.
const STATUS_TINT = {
    pending: "[--frame-panel-bg:color-mix(in_srgb,var(--muted-foreground)_6%,var(--card))]   [--frame-panel-border-color:color-mix(in_srgb,var(--muted-foreground)_20%,transparent)]",
    running: "[--frame-panel-bg:color-mix(in_srgb,var(--active-foreground)_10%,var(--card))]   [--frame-panel-border-color:color-mix(in_srgb,var(--info-foreground)_35%,transparent)]",
    paused: "[--frame-panel-bg:color-mix(in_srgb,var(--warning)_10%,var(--card))]           [--frame-panel-border-color:color-mix(in_srgb,var(--warning)_35%,transparent)]",
    suspended: "[--frame-panel-bg:color-mix(in_srgb,var(--warning)_10%,var(--card))]           [--frame-panel-border-color:color-mix(in_srgb,var(--warning)_35%,transparent)]",
    completed: "[--frame-panel-bg:color-mix(in_srgb,var(--success-foreground)_8%,var(--card))] [--frame-panel-border-color:color-mix(in_srgb,var(--success-foreground)_30%,transparent)]",
    failed: "[--frame-panel-bg:color-mix(in_srgb,var(--destructive)_10%,var(--card))]       [--frame-panel-border-color:color-mix(in_srgb,var(--destructive)_35%,transparent)]",
    terminated: "[--frame-panel-bg:color-mix(in_srgb,var(--destructive)_6%,var(--card))]        [--frame-panel-border-color:color-mix(in_srgb,var(--destructive)_20%,transparent)]",
    // Keyed by the enum, so adding a status fails to compile until it has a tint.
} satisfies Record<Execution.Status, string>

// Frame.Panel paints from these two properties, so a status recolours it without
// competing with the classes it already carries.
const executionVariants = cva(
    [],
    {
        variants: {
            status: STATUS_TINT,
        },
        defaultVariants: {
            status: "pending",
        },
    }
)


const STATUS_BADGE_TINT = {
    pending: "border-[color-mix(in_srgb,var(--muted-foreground)_35%,transparent)]   bg-[color-mix(in_srgb,var(--muted-foreground)_18%,transparent)]   text-[var(--muted-foreground)]",
    running: "border-[color-mix(in_srgb,var(--active-foreground)_45%,transparent)]  bg-[color-mix(in_srgb,var(--active-foreground)_20%,transparent)]  text-[var(--active-foreground)]",
    paused: "border-[color-mix(in_srgb,var(--warning)_45%,transparent)]            bg-[color-mix(in_srgb,var(--warning)_20%,transparent)]            text-[var(--warning-foreground)]",
    suspended: "border-[color-mix(in_srgb,var(--warning)_45%,transparent)]            bg-[color-mix(in_srgb,var(--warning)_20%,transparent)]            text-[var(--warning-foreground)]",
    completed: "border-[color-mix(in_srgb,var(--success-foreground)_40%,transparent)] bg-[color-mix(in_srgb,var(--success-foreground)_16%,transparent)] text-[var(--success-foreground)]",
    failed: "border-[color-mix(in_srgb,var(--destructive)_45%,transparent)]        bg-[color-mix(in_srgb,var(--destructive)_20%,transparent)]        text-[var(--destructive)]",
    terminated: "border-[color-mix(in_srgb,var(--destructive)_30%,transparent)]        bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)]        text-[var(--destructive)]",
} satisfies Record<Execution.Status, string>

// A box inside the item, so it paints itself rather than the frame properties.
const executionStatusVariants = cva(
    ["inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-none"],
    {
        variants: {
            status: STATUS_BADGE_TINT,
        },
        defaultVariants: {
            status: "pending",
        },
    }
)


/**
 * What a column shows first. Paused and suspended sit with running — all three
 * have not finished — and terminated joins the settled runs.
 */
const STATUS_TIER = {
    running: 0,
    paused: 0,
    suspended: 0,
    pending: 1,
    completed: 2,
    failed: 2,
    terminated: 2,
} satisfies Record<Execution.Status, number>

const SETTLED = 2

/** Settled runs are ordered by when they finished, the rest by when they started. */
const byActivity = (a: Execution.Meta, b: Execution.Meta) => {
    const tier = STATUS_TIER[a.status] - STATUS_TIER[b.status]

    if (tier !== 0)
        return tier

    const stamp = (execution: Execution.Meta) =>
        Date.parse(STATUS_TIER[execution.status] === SETTLED ? execution.updated_at : execution.created_at)

    return stamp(b) - stamp(a)
}



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

                {status === "running" && <Spinner />}

                <div className={cn('absolute top-1 left-1', executionStatusVariants({ status: execution.status }))}>
                    {status}
                </div>



                {/* Duration */}
                {(status === "failed" || status === "terminated" || status === "completed") && (
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
                        <DropdownMenu.Item variant="destructive">Terminate</DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>

            </Frame.Panel>
        </Kanban.Item>
    )
}


const ActivityKanban = () => {

    ActivitySDK.useActivityBootstrapQuery()

    const activity = ActivitySDK.useStore(s => s.activity)

    const columns = useMemo(
        () => Object.fromEntries(
            Object.entries(activity.workflows).map(([id, column]) => [id, [...column.executions].sort(byActivity)])
        ) as Record<string, Execution.Meta[]>,
        [activity.workflows],
    )

    return (
        <Kanban.Root
            value={columns}
            onValueChange={() => { }}
            getItemValue={(task) => task.id}
            onValueCommit={(next, meta) => console.log(meta.kind, next)}
        >
            <Kanban.Board className='flex overflow-x-auto [&>*]:w-[220px] [&>*]:shrink-0'>
                {Object.keys(columns).map((columnId) => {
                    const workflow = activity.workflows[columnId as Workflow.Id]
                    return (
                        <Kanban.Column key={columnId} value={columnId} asChild>
                            <Frame.Root spacing='sm' className='p-2 gap-2' >
                                <Frame.Header className='flex flex-row px-2 pt-0! items-center gap-2'>
                                    <LazyIcon
                                        name={workflow.icon ?? "Graph"}
                                        className="size-4"
                                        style={{ color: iconColor(workflow) }}
                                    />
                                    <Frame.Title className='text-xs'>
                                        {workflow.display_name}
                                    </Frame.Title>

                                    <Kanban.ColumnHandle className='ml-auto'>
                                        <SystemIcons.GripVertical size={14} />
                                    </Kanban.ColumnHandle>
                                </Frame.Header>
                                <Kanban.ColumnContent value={columnId} className='gap-2'>
                                    {columns[columnId].map((execution) => (
                                        <ExecutionItem key={execution.id} execution={execution} />
                                    ))}
                                </Kanban.ColumnContent>
                            </Frame.Root>
                        </Kanban.Column>
                    )
                })}
            </Kanban.Board>

            <Kanban.Overlay>
                {({ value }) => (
                    <Frame.Root spacing='sm'>
                        <Frame.Panel fit className='text-xs'>
                            {activity.workflows[value as Workflow.Id]?.display_name}
                        </Frame.Panel>
                    </Frame.Root>
                )}
            </Kanban.Overlay>
        </Kanban.Root>
    )
}

export default ActivityKanban


