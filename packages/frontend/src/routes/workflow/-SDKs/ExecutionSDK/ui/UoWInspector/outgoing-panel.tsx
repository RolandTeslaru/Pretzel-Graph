import { useMemo } from 'react'
import { ExecutionSDK } from '../../sdk'
import { useTimelineViewerStore } from '../../timeline-viewer-store'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { PortDataTree } from '../../../WorkbenchSDK/ui/NodePanel/PortDataTree'
import { projectionsToTree } from '@/components/Tree/toTree'
import type { Execution, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

const OutgoingPanel = () => {
    const uowId = useTimelineViewerStore(s => s.selectedUoW)
    const recording = ExecutionSDK.useStore(s => s.currentExecution?.recording)
    const uow = uowId ? recording?.units[uowId] : undefined

    const trackId = uow?.trackId
    const node = WorkbenchSDK.useStore(s => {
        if (!trackId) return undefined
        const snap = recording?.workflowDataSnapshot?.nodes[trackId]
        return snap ?? s.selectors.node.get(s, trackId as Workflow.Node.Id)
    })

    return (
        <div className='p-2 h-full overflow-auto relative'>
            <div className=' w-full border-b border-border/50 px-2 pt-0.5 pb-2 flex flex-row gap-2 '>
                <SystemIcons.LogOut size={20} />
                <p className='h-auto my-auto text-sm'>Outgoing Data</p>
            </div>
            {uow && node && recording && <Content uow={uow} node={node} recording={recording} />}
        </div>
    )
}

export default OutgoingPanel

const Content = ({
    uow,
    node,
    recording,
}: {
    uow: Execution.Recording.UnitOfWork
    node: Workflow.Node
    recording: Execution.Recording
}) => {
    const keyNameMap = useMemo(
        () => Object.fromEntries(node.outputs.map(o => [o.id, o.displayName])),
        [node.outputs]
    )

    const portVariantMap = useMemo(
        () => Object.fromEntries(node.outputs.map(o => [o.id, o.variant])),
        [node.outputs]
    )

    const root = useMemo(() => {
        const outgoingData: Record<string, Record<string, unknown>> = {}
        for (const [portId, snapId] of Object.entries(uow.outputSnapshot)) {
            const snap = recording.dataBank.snapshots[snapId]
            if (snap?.value !== undefined) {
                outgoingData[portId] = snap.value as Record<string, unknown>
            }
        }
        return projectionsToTree(outgoingData)
    }, [uow.outputSnapshot, recording.dataBank.snapshots])

    if (Object.keys(uow.outputSnapshot).length === 0) {
        return (
            <div className='mt-2 pt-8 text-xs text-muted-foreground px-1'>
                No outgoing data recorded.
            </div>
        )
    }

    return (
        <div className='pt-2'>
            <PortDataTree root={root} keyNameMap={keyNameMap} portVariantMap={portVariantMap} />
        </div>
    )
}
