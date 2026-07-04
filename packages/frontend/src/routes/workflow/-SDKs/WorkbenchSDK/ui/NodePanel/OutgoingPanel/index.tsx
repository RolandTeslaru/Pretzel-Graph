import { PortProjectionsView } from '../PortDataTree'
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { WorkbenchSDK } from '../../../sdk'
import type { Execution, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

const OutgoingPanel = () => {
  const nodeId = WorkbenchSDK.useStore(s => s.selectors.getClickedNode(s)?.id)
  const execution = ExecutionSDK.useStore(s => s.currentExecution)
  return (
    <div className="p-1 h-full overflow-y-auto flex flex-col gap-2">
      <div className='w-full border-b border-border/50 px-3 py-2 flex flex-row gap-2'>
        <SystemIcons.LogOut size={20} />
        <p className='h-auto my-auto text-sm'>Outgoing Data</p>
      </div>
      {nodeId && execution && <Content nodeId={nodeId} execution={execution} />}
    </div>
  )
}

export default OutgoingPanel

const Content = ({ nodeId, execution }: { nodeId: Workflow.Node.Id; execution: Execution }) => {

  const outputs = WorkbenchSDK.useOutputs(nodeId)

  return (
    <PortProjectionsView
      ports={outputs}
      projections={execution.session.node_output_projections[nodeId] as Record<string, Record<string, unknown>> ?? {}}
      emptyMessage="No output data yet."
    />
  )
}
