import { PortProjectionsView } from '../PortDataTree'
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { WorkbenchSDK } from '../../../sdk'
import type { Execution, Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { useMemo } from 'react'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { AddInputPortDialog } from './AddInputPortDialog'

const IncomingPanel = () => {
  const nodeId = WorkbenchSDK.useStore(s => s.selectors.getClickedNode(s)?.id)
  const execution = ExecutionSDK.useStore(s => s.currentExecution)

  const openAddInputPortDialog = () => {
    if (!nodeId) return
    const dialogId = `add-input-port-${nodeId}`
    DialogSDK.actions.push(dialogId, props => (
      <DialogSDK.Template {...props} className='sm:max-w-[520px] w-full'>
        <AddInputPortDialog nodeId={nodeId} dialogId={dialogId} />
      </DialogSDK.Template>
    ))
  }

  return (
    <div className='p-1 h-full overflow-auto relative flex flex-col gap-2'>
      <div className='w-full border-b border-border/50 px-3 py-2 flex flex-row gap-2'>
        <SystemIcons.LogIn size={20} />
        <p className='h-auto my-auto text-sm'>Incoming Data</p>
      </div>
      {nodeId && execution && <Content nodeId={nodeId} execution={execution} />}
      <Button variant="ghost" className="absolute bottom-2 left-2 right-2" onClick={openAddInputPortDialog}>
        <p>+ Add Input Port</p>
      </Button>
    </div>
  )
}

export default IncomingPanel

const Content = ({ nodeId, execution }: { nodeId: Workflow.Node.Id; execution: Execution }) => {
  const [node, cache, edges] = WorkbenchSDK.useStore(s => [
    s.selectors.node.get(s, nodeId),
    s.cache,
    s.data.edges,
  ])

  const projections = useMemo(() => {
    const result: Record<string, Record<string, unknown>> = {}
    Object.entries(cache.inputHandlesMap[nodeId] ?? {}).forEach(([targetPortId, edgeId]) => {
      const edge = edges[edgeId as Workflow.Edge.Id]
      if (!edge) return
      const sourceProjection = execution.session.node_output_projections[edge.source.nodeId]
      const value = sourceProjection?.[edge.source.portId as Foundations.Port.Output.Id]
      if (value !== undefined) result[targetPortId] = value as Record<string, unknown>
    })
    return result
  }, [cache, edges, nodeId, execution])

  if (!node) return null

  return (
    <PortProjectionsView
      ports={node.inputs}
      projections={projections}
      emptyMessage="No incoming data yet."
    />
  )
}
