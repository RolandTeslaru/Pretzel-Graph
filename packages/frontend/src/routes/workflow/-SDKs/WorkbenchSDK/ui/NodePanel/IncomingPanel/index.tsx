import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { WorkbenchSDK } from '../../../sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { AddInputPortDialog } from './AddInputPortDialog'
import { Content } from './content'
import type { Foundations, Workflow } from '@pretzel-graph/shared/domain'

interface Props {
  nodeId: Workflow.Node.Id
  inputs: Foundations.Port.Input[]
}

const IncomingPanel = ({ nodeId, inputs }: Props) => {

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


      <Button variant="ghost" className="absolute bottom-2 left-2 right-2" onClick={openAddInputPortDialog}>
        <p>+ Add Input Port</p>
      </Button>
    </div>
  )
}

export default IncomingPanel
