import { WorkbenchSDK } from '../../sdk'
import { useEffect } from 'react'
import FullScreenContent from './Content'

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


