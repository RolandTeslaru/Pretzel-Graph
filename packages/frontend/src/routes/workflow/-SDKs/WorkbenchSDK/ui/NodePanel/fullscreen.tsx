import { WorkbenchSDK } from '../../sdk'
import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { Workflow } from '@pretzel-graph/shared/domain'
import { Content } from './index'
import IncomingPanel from './IncomingPanel'
import OutgoingPanel from './OutgoingPanel'

type FullScreenProps = { hyNode: Workflow.Node.Hydrated; blockTransparency: boolean; surfaceStyle: CSSProperties }

const FullScreenContent = ({ hyNode, blockTransparency, surfaceStyle }: FullScreenProps) => {
  // In the background (another dialog stacked on top) render solid; on top, frosted glass.
  // `surfaceStyle` carries the stack-darkening brightness filter — applied per card here
  // (not on the dialog wrapper) so each card's backdrop-blur isn't trapped by a filtered ancestor.
  const surface = blockTransparency ? 'bg-card' : 'bg-card/90 backdrop-blur-md'

  return (
    <>
      <div style={surfaceStyle} className={`${surface} overflow-hidden w-full min-w-0 h-full top-0 border-border border rounded-2xl shadow-xl shadow-black/10`}>
        <IncomingPanel nodeId={hyNode.id} />
      </div>
      <div style={surfaceStyle} className={`${surface} lg:min-w-[450px] h-full flex flex-col overflow-hidden relative border border-border/50 rounded-2xl shadow-xl shadow-black/10`}>
        <Content hyNode={hyNode} showFooter={false} />
      </div>
      <div style={surfaceStyle} className={`${surface} overflow-hidden h-full w-full min-w-0 border-border border rounded-2xl shadow-xl shadow-black/10`}>
        <OutgoingPanel nodeId={hyNode.id} />
      </div>
    </>
  )
}

const FullScreenNodePanel = ({ blockTransparency, surfaceStyle }: { blockTransparency: boolean; surfaceStyle: CSSProperties }) => {
  const nodeId = WorkbenchSDK.useClickedNodeId() ?? "" as Workflow.Node.Id

  const hyNode = WorkbenchSDK.useNode(nodeId)

  useEffect(() => {
    if (!nodeId) {
      WorkbenchSDK.actions.ui.closeNodePanelFullscreen()
    }
  }, [nodeId])

  if (!hyNode) return null

  return (
    <div className="flex flex-row gap-5 h-[85vh] w-[90vw]">
      <FullScreenContent hyNode={hyNode} blockTransparency={blockTransparency} surfaceStyle={surfaceStyle} />
    </div>
  )
}

export default FullScreenNodePanel
