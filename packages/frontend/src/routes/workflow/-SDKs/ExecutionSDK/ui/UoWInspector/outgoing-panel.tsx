import { useMemo } from 'react'
import { ExecutionSDK } from '../../sdk'
import { WorkbenchSDK } from '../../../WorkbenchSDK/sdk'
import { PortProjectionsView } from '../../../WorkbenchSDK/ui/NodePanel/PortDataTree'
import type { Execution, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

const OutgoingPanel = () => {
    const [uow, snapshotedNode, dataBank] = ExecutionSDK.useStore(s => {
        const uow = s.selectors.recording.getSelectedUoW(s)
        if (!uow)
            return [undefined, undefined, undefined]

        const snapshotedNode = s.selectors.recording.getSnapshotedNode(s, uow.trackId)
        const dataBank = s.selectors.recording.getDatabank(s)
        if (!dataBank)
            return [undefined, undefined, undefined]

        return [uow, snapshotedNode, dataBank]
    })
    const trackId = uow?.trackId

    const node = WorkbenchSDK.useDocument(d => {
        if (!trackId) 
            return undefined
        
        return snapshotedNode ?? d.selectors.node.get(d, trackId)
    })

    return (
        <div className='p-1 h-full overflow-auto relative flex flex-col gap-2'>
            <div className='w-full border-b border-border/50 px-3 py-2 flex flex-row gap-2'>
                <SystemIcons.LogOut size={20} />
                <p className='h-auto my-auto text-sm'>Outgoing Data</p>
            </div>
            {uow && node  && <Content uow={uow} node={node} dataBank={dataBank} />}
        </div>
    )
}

export default OutgoingPanel

const Content = ({
    uow,
    node,
    dataBank
}: {
    uow: Execution.Recording.UnitOfWork
    node: Workflow.Node.Raw
    dataBank: Execution.Recording.DataBank
}) => {

    const projections = useMemo(() => {
        const result: Record<string, Record<string, unknown>> = {}
        for (const [portId, snapId] of Object.entries(uow.outputSnapshot)) {
            const snap = dataBank.snapshots[snapId]
            if (snap?.value !== undefined) 
                result[portId] = snap.value as Record<string, unknown>
        }
        return result
    }, [uow.outputSnapshot, dataBank.snapshots])

    return (
        <PortProjectionsView
            ports={WorkbenchSDK.document.selectors.node.getOutputs(WorkbenchSDK.document, node.id)}
            projections={projections as Execution.Session["node_output_projections"]}
            emptyMessage="No outgoing data recorded."
        />
    )
}
