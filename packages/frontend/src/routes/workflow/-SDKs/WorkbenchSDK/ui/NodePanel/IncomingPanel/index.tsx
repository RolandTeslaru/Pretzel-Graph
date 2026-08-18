import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import { WorkbenchSDK } from '../../../sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { AddInputPortDialog } from './AddInputPortDialog'
import { Content } from './content'
import type { Workflow } from '@pretzel-graph/shared/domain'

interface Props {
  nodeId: Workflow.Node.Id
}

const IncomingPanel = ({ nodeId }: Props) => {
  // Resolved here rather than passed in — this panel is mounted from a pushed closure,
  // which would freeze the ports it captured until the panel is torn down.
  const inputs = WorkbenchSDK.useInputs(nodeId)

  const blueprintId = WorkbenchSDK.useStore(s => {
    const node = s.data.nodes[nodeId]
    return node?.reconciledBlueprintId ?? node?.blueprintId
  })
  const isIgniter = ShelfSDK.useStore(s => blueprintId ? s.blueprints[blueprintId]?.igniter ?? false : false)

  const nodeOutputProjections = ExecutionSDK.useStore(s => s.currentExecution?.session.node_output_projections)

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

      {nodeId && nodeOutputProjections &&
       <Content nodeId={nodeId} inputs={inputs} nodeOutputProjections={nodeOutputProjections} />
      }


      <Button variant="ghost" className="absolute bottom-2 left-2 right-2" onClick={openAddInputPortDialog} disabled={isIgniter}>
        <p>+ Add Input Port</p>
      </Button>
    </div>
  )
}

export default IncomingPanel
