import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { WorkbenchSDK } from '../../../sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Content } from './content'
import type { Workflow } from '@pretzel-graph/shared/domain'

interface Props {
  nodeId: Workflow.Node.Id
}

const OutgoingPanel = ({ nodeId }: Props) => {
  // Resolved here rather than passed in — this panel is mounted from a pushed closure,
  // which would freeze the ports it captured until the panel is torn down.
  const outputs = WorkbenchSDK.useOutputs(nodeId)

  const outputProjections = ExecutionSDK.useStore(s => {
    const execution = s.currentExecution
    if (!execution || !nodeId) 
      return null
    
    return execution.session.node_output_projections[nodeId] ?? {}
  })

  return (
    <div className="p-1 h-full overflow-y-auto flex flex-col gap-2">
      
      
      <div className='w-full border-b border-border/50 px-3 py-2 flex flex-row gap-2'>
        <SystemIcons.LogOut size={20} />
        <p className='h-auto my-auto text-sm'>Outgoing Data</p>
      </div>


      {nodeId && outputProjections && 
        <Content outputs={outputs} outputProjections={outputProjections} />
      }
    </div>
  )
}

export default OutgoingPanel
