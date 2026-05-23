import { useMemo } from 'react'
import { ExecutionSDK } from '../../sdk'
import { useTimelineViewerStore } from '../../timeline-viewer-store'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { PortDataTree } from '../../../WorkbenchSDK/ui/NodePanel/PortDataTree'
import { projectionsToTree } from '@/components/Tree/toTree'
import type { Recording, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

const IncomingPanel = () => {
    const uowId = useTimelineViewerStore(s => s.selectedUoW)
    const recording = ExecutionSDK.useStore(s => s.currentRecording)
    const uow = uowId ? recording?.units[uowId] : undefined

    const trackId = uow?.trackId
    const node = WorkbenchSDK.useStore(s => {
        if (!trackId) return undefined
        const snap = recording?.workflowDataSnapshot?.nodes[trackId]
        return snap ?? s.selectors.node.get(s, trackId as Workflow.Node.Id)
    })

    return (
        <div className='p-2 h-full overflow-auto relative'>
            <div className='fixed z-10 top-2 left-2 w-[calc(100%-1rem)] bg-card-float border border-border rounded-full p-1 flex flex-row gap-2 shadow-md shadow-black/10 dark:shadow-black/20 dark:shadow-lg'>
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
    uow: Recording.UnitOfWork
    node: Workflow.Node
    recording: Recording
}) => {
    const keyNameMap = useMemo(
        () => Object.fromEntries(node.inputs.map(i => [i.id, i.displayName])),
        [node.inputs]
    )

    const portVariantMap = useMemo(
        () => Object.fromEntries(node.inputs.map(i => [i.id, i.variant])),
        [node.inputs]
    )

    const root = useMemo(() => {
        const incomingData: Record<string, Record<string, unknown>> = {}
        for (const [portId, snapId] of Object.entries(uow.inputSnapshot)) {
            const snap = recording.dataBank.snapshots[snapId]
            if (snap?.value !== undefined) {
                incomingData[portId] = snap.value as Record<string, unknown>
            }
        }
        return projectionsToTree(incomingData)
    }, [uow.inputSnapshot, recording.dataBank.snapshots])

    if (Object.keys(uow.inputSnapshot).length === 0) {
        return (
            <div className='mt-2 pt-8 text-xs text-muted-foreground px-1'>
                No incoming data recorded.
            </div>
        )
    }

    return (
        <div className='mt-2 pt-8'>
            <PortDataTree root={root} keyNameMap={keyNameMap} portVariantMap={portVariantMap} />
        </div>
    )
}
