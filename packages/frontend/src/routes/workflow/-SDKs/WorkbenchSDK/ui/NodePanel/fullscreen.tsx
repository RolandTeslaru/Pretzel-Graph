import { WorkbenchSDK } from '../../sdk'
import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { Workflow } from '@pretzel-graph/shared/domain'
import { Content } from './index'
import IncomingPanel from './IncomingPanel'
import OutgoingPanel from './OutgoingPanel'

type FullScreenProps = { clickedNode: Workflow.Node; blockTransparency: boolean; surfaceStyle: CSSProperties }

const FullScreenContent = ({ clickedNode, blockTransparency, surfaceStyle }: FullScreenProps) => {
  // In the background (another dialog stacked on top) render solid; on top, frosted glass.
  // `surfaceStyle` carries the stack-darkening brightness filter — applied per card here
  // (not on the dialog wrapper) so each card's backdrop-blur isn't trapped by a filtered ancestor.
  const surface = blockTransparency ? 'bg-card' : 'bg-card/80 backdrop-blur-md'

  return (
    <>
      <div style={surfaceStyle} className={`${surface} overflow-hidden w-full min-w-0 h-full top-0 border-border border rounded-2xl shadow-xl shadow-black/10`}>
        <IncomingPanel />
      </div>
      <div style={surfaceStyle} className={`${surface} lg:min-w-[450px] relative overflow-visible border border-border/50 rounded-2xl shadow-xl shadow-black/10`}>
        <Content clickedNode={clickedNode} showFooter={false} />
      </div>
      <div style={surfaceStyle} className={`${surface} overflow-hidden h-full w-full min-w-0 border-border border rounded-2xl shadow-xl shadow-black/10`}>
        <OutgoingPanel />
      </div>
    </>
  )
}

const FullScreenNodePanel = ({ blockTransparency, surfaceStyle }: { blockTransparency: boolean; surfaceStyle: CSSProperties }) => {
  const clickedNode = WorkbenchSDK.useStore(s => s.selectors.getClickedNode(s))

  useEffect(() => {
    if (!clickedNode) {
      WorkbenchSDK.actions.ui.closeNodePanelFullscreen()
    }
  }, [clickedNode])

  if (!clickedNode) return null

  return (
    <div className="flex flex-row gap-5 h-[85vh] w-[90vw]">
      <FullScreenContent clickedNode={clickedNode} blockTransparency={blockTransparency} surfaceStyle={surfaceStyle} />
    </div>
  )
}

export default FullScreenNodePanel
