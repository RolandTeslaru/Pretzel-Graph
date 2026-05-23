import React, { memo } from 'react'
import { ExecutionSDK } from '../../sdk'
import { Recording, Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { UoWInspectorFooter } from './footer'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'

interface Props {
    uowId: Recording.UnitOfWork.Id
}

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

            <UoWInspectorFooter />
        </>
    )
})
