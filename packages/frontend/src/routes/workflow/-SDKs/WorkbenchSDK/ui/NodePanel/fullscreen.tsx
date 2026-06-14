import { WorkbenchSDK } from '../../sdk'
import { useEffect } from 'react'
import { Workflow } from '@pretzel-graph/shared/domain'
import { Content } from './index'
import IncomingPanel from './IncomingPanel'
import OutgoingPanel from './OutgoingPanel'

const FullScreenContent = ({ clickedNode }: { clickedNode: Workflow.Node }) => (
  <>
    <div className='bg-card/80 overflow-hidden w-full min-w-0 h-full top-0 border-border border rounded-2xl shadow-xl shadow-black/10 backdrop-blur-lg'>
      <IncomingPanel />
    </div>
    <div className="lg:min-w-[450px] relative overflow-visible bg-card/80 border border-border/50 rounded-2xl shadow-xl shadow-black/10 backdrop-blur-lg">
      <Content clickedNode={clickedNode} showFooter={false} />
    </div>
    <div className='bg-card/80 overflow-hidden h-full w-full min-w-0 border-border border rounded-2xl shadow-xl shadow-black/10 backdrop-blur-lg'>
      <OutgoingPanel />
    </div>
  </>
)

const FullScreenNodePanel = () => {
  const clickedNode = WorkbenchSDK.useStore(s => s.selectors.getClickedNode(s))

  useEffect(() => {
    if (!clickedNode) {
      WorkbenchSDK.actions.ui.closeNodePanelFullscreen()
    }
  }, [clickedNode])

  if (!clickedNode) return null

  return (
    <div className="flex flex-row gap-5 h-[85vh] w-[90vw]">
      <FullScreenContent clickedNode={clickedNode} />
    </div>
  )
}

export default FullScreenNodePanel
