import { useMemo } from 'react'
import { ExecutionSDK } from '../../sdk'
import { useTimelineViewerStore } from '../../timeline-viewer-store'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { PortProjectionsView } from '../../../WorkbenchSDK/ui/NodePanel/PortDataTree'
import type { Execution, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

const IncomingPanel = () => {
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
        <div className='p-1 h-full overflow-auto relative flex flex-col gap-2'>
            <div className='w-full border-b border-border/50 px-3 py-2 flex flex-row gap-2'>
                <SystemIcons.LogIn size={20} />
                <p className='h-auto my-auto text-sm'>Incoming Data</p>
            </div>
            {uow && node && recording && <Content uow={uow} node={node} recording={recording} />}
        </div>
    )
}

export default IncomingPanel

const Content = ({
    uow,
    node,
    recording,
}: {
    uow: Execution.Recording.UnitOfWork
    node: Workflow.Node
    recording: Execution.Recording
}) => {
    const projections = useMemo(() => {
        const result: Record<string, Record<string, unknown>> = {}
        for (const [portId, snapId] of Object.entries(uow.inputSnapshot)) {
            const snap = recording.dataBank.snapshots[snapId]
            if (snap?.value !== undefined) result[portId] = snap.value as Record<string, unknown>
        }
        return result
    }, [uow.inputSnapshot, recording.dataBank.snapshots])

    return (
        <PortProjectionsView
            ports={node.inputs}
            projections={projections}
            emptyMessage="No incoming data recorded."
        />
    )
}
