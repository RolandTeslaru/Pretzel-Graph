import { Workflow } from '@pretzel-graph/shared/domain'
import { Content } from '../NodePanel/index'
import IncomingPanel from '../NodePanel/IncomingPanel'
import OutgoingPanel from '../NodePanel/OutgoingPanel'

const FullScreenContent = ({ clickedNode }: { clickedNode: Workflow.Node }) => {


  return (
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
}

export default FullScreenContent
