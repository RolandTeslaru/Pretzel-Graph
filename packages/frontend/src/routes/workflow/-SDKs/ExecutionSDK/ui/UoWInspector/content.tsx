import React, { memo } from 'react'
import { ExecutionSDK } from '../../sdk'
import { Recording, Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { UoWInspectorFooter } from './footer'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { Badge, ScrollArea } from '@pretzel-graph/standard-ui/foundations'
import { Accordion } from '@pretzel-graph/standard-ui/foundations/accordion'

interface Props {
    uowId: Recording.UnitOfWork.Id
}

/** Formats a millisecond duration into a compact human-readable string. */
function formatDuration(ms: number | undefined): string {
    if (ms === undefined) return '—'
    if (ms < 1)    return '< 1ms'
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
}

/** Formats a ms-from-origin timestamp as a relative offset string. */
function formatStartedAt(ms: number): string {
    if (ms < 1000) return `+${Math.round(ms)}ms`
    return `+${(ms / 1000).toFixed(2)}s`
}

const DEFAULT_OPEN_DRAWERS = ["general"]


interface AccordionItemProps {
    label: string
    value: string
    children: React.ReactNode
}

const AccordionItem = ({ label, value, children }: AccordionItemProps) => (
    <Accordion.Item value={value} className='border-none'>
        <Accordion.Trigger className='px-3 cursor-pointer hover:no-underline'>
            <h4 className='text-sm font-semibold text-foreground tracking-tight'>{label}</h4>
        </Accordion.Trigger>
        <Accordion.Content className='flex flex-col gap-2 bg-background/60 py-2 px-4'>
            {children}
        </Accordion.Content>
    </Accordion.Item>
)



export const Content = memo(({ uowId }: Props) => {

    const uow = ExecutionSDK.useStore(s => s.currentRecording?.units[uowId])

    const fallbackNode = WorkbenchSDK.useStore(s => s.selectors.node.get(s, uow?.trackId ?? "" as Workflow.Node.Id))

    const recordingNode = ExecutionSDK.useStore(s => {
        const trackId = uow?.trackId
        if (!trackId) return undefined

        const nodeId = s.currentRecording?.tracks[trackId]?.id
        if (!nodeId) return undefined

        return s.currentRecording?.workflowDataSnapshot?.nodes[nodeId]
    })

    const node = recordingNode ?? fallbackNode

    if (!uow || !node) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2 animate-pulse">
                <LazyIcon name="Film" className="text-muted-foreground size-5" />
                Unit of Work not found
            </div>
        )
    }

    return (
        <>
            <div className='absolute z-10 top-2 left-2 right-2 flex flex-row gap-2'>
                <div
                    className='flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md min-w-0 max-w-xs'
                    style={{
                        backgroundColor: node.accent ? `color-mix(in srgb, var(--${node.accent}) 25%, transparent)` : 'var(--muted)',
                    }}
                >
                    <LazyIcon
                        className='my-auto h-4 w-4 shrink-0'
                        name={node.icon as string}
                        style={{ color: node.accent ? `var(--${node.accent}-foreground)` : undefined }}
                    />
                    <h4
                        className='text-sm font-semibold truncate min-w-0'
                        style={{ color: node.accent ? `var(--${node.accent}-foreground)` : undefined }}
                    >
                        Unit of Work
                    </h4>
                </div>
            </div>

            <ScrollArea.Root className='pt-14 mask-[linear-gradient(to_bottom,transparent,black_48px,black_calc(100%-48px),transparent)]'>
                <Accordion.Root
                    type='multiple'
                    defaultValue={DEFAULT_OPEN_DRAWERS}
                    className='pb-14'
                >
                    <AccordionItem label="General" value="general">
                        <div className='flex flex-row gap-2 justify-between'> 
                            <p className='text-xs text-muted-foreground'>Status</p>
                            <Badge size="sm" variant={uow.status === "completed" ? "success" : uow.status === "failed" ? "destructive" : "outline"}>
                                {uow.status}
                            </Badge>
                        </div>
                        <div className='flex flex-row gap-2 justify-between'>
                            <p className='text-xs text-muted-foreground'>Duration</p>
                            <p className='text-xs text-foreground/50'>{formatDuration(uow.duration)}</p>
                        </div>
                        <div className='flex flex-row gap-2 justify-between'>
                            <p className='text-xs text-muted-foreground'>Started At</p>
                            <p className='text-xs text-foreground/50'>{formatStartedAt(uow.startedAt)}</p>
                        </div>
                    </AccordionItem>
                </Accordion.Root>
            </ScrollArea.Root>

            <UoWInspectorFooter />
        </>
    )
})

