import React, { memo } from 'react'
import { ExecutionSDK } from '../../sdk'
import { Execution } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { UoWInspectorFooter } from './footer'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { Badge, ScrollArea } from '@pretzel-graph/standard-ui/foundations'
import { Accordion } from '@pretzel-graph/standard-ui/foundations/accordion'
import { formatDuration, formatStartedAt, formatMetric } from './utils'

interface Props {
    uowId: Execution.Recording.UnitOfWork.Id
}

const DEFAULT_OPEN_DRAWERS = ["general", "fields", "metrics"]


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

    const [uow, snapshotedNode] = ExecutionSDK.useStore(s => {
        const uow = s.selectors.recording.getUoW(s, uowId)
        if (!uow)
            return [undefined, undefined]

        const snapshotedNode = s.selectors.recording.getSnapshotedNode(s, uow.trackId)
        return [uow, snapshotedNode]
    })

    const [node, ui] = WorkbenchSDK.useStore(s => {
        const trackId = uow?.trackId
        if (!trackId)
            return [undefined, undefined]

        return [
            snapshotedNode ?? s.selectors.node.get(s, trackId),
            s.selectors.node.getUI(s, trackId),
        ]
    })

    if (!uow || !node) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2 animate-pulse">
                <IconRenderer name="Film" className="text-muted-foreground size-5" />
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
                        backgroundColor: ui.accent ? `color-mix(in srgb, var(--${ui.accent}) 25%, transparent)` : 'var(--muted)',
                    }}
                >
                    <IconRenderer
                        className='my-auto h-4 w-4 shrink-0'
                        name={ui.icon}
                        style={{ color: ui.accent ? `var(--${ui.accent}-foreground)` : undefined }}
                    />
                    <h4
                        className='text-sm font-semibold truncate min-w-0'
                        style={{ color: ui.accent ? `var(--${ui.accent}-foreground)` : undefined }}
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
                            <p className='text-xs text-muted-foreground'>Name</p>
                            <p className='text-xs text-foreground/50'>{ui.displayName}</p>
                        </div>
                        <div className='flex flex-row gap-2 justify-between'>
                            <p className='text-xs text-muted-foreground'>Blueprint</p>
                            <p className='text-xs text-foreground/50'>{node.blueprintId}</p>
                        </div>
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

                    {uow.metrics && Object.keys(uow.metrics).length > 0 && (
                        <AccordionItem label="Metrics" value="metrics">
                            {Object.entries(uow.metrics).map(([key, metric]) => (
                                <div key={key} className='flex flex-row gap-2 justify-between'>
                                    <p className='text-xs text-muted-foreground'>{metric.displayName}</p>
                                    <p className={`text-xs text-foreground/50 ${metric.type === "currency_usd" ? "text-green-500 font-mono" : ""}`}>{formatMetric(metric)}</p>
                                </div>
                            ))}
                        </AccordionItem>
                    )}

                    {uow.fieldSnapshot && Object.keys(uow.fieldSnapshot).length > 0 && (
                        <AccordionItem label="Fields" value="fields">
                            {Object.entries(uow.fieldSnapshot).map(([key, value]) => {
                                const isComplex = value !== null && value !== undefined && typeof value === 'object'
                                const display = isComplex ? JSON.stringify(value) : String(value ?? '—')
                                return (
                                    <div key={key} className='flex flex-row gap-2 justify-between'>
                                        <p className='text-xs text-muted-foreground shrink-0'>{key}</p>
                                        <p className='text-xs text-foreground/50 text-right break-all'>{display}</p>
                                    </div>
                                )
                            })}
                        </AccordionItem>
                    )}
                </Accordion.Root>
            </ScrollArea.Root>

            <UoWInspectorFooter />
        </>
    )
})

