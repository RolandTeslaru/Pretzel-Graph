import { WorkbenchSDK } from '../../sdk'
import { useEffect } from 'react'
import { Workflow } from '@pretzel-graph/shared/domain'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { Content } from './index'
import IncomingPanel from './IncomingPanel'
import OutgoingPanel from './OutgoingPanel'

const FullScreenNodePanel = (props: DialogSDK.TemplateProps) => {
  const nodeId = WorkbenchSDK.useClickedNodeId() ?? "" as Workflow.Node.Id

  const hyNode = WorkbenchSDK.useNode(nodeId)

  useEffect(() => {
    if (!nodeId) {
      WorkbenchSDK.actions.ui.closeNodePanelFullscreen()
    }
  }, [nodeId])

  return (
    <DialogSDK.TripleSplitTemplate
      {...props}
      className='h-[85vh] w-[90vw]'
      leftSidebarClassName='w-[30%] p-0! overflow-hidden'
      rightSidebarClassName='w-[30%] p-0! overflow-hidden'
      contentClassName='p-0! gap-0! min-w-0 lg:min-w-[450px] overflow-hidden relative'
      leftSidebarRenderer={() => hyNode && <IncomingPanel nodeId={hyNode.id} />}
      rightSidebarRenderer={() => hyNode && <OutgoingPanel nodeId={hyNode.id} />}
    >
      {hyNode && <Content hyNode={hyNode} showFooter={false} />}
    </DialogSDK.TripleSplitTemplate>
  )
}

export default FullScreenNodePanel
