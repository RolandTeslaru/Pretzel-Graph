import React from 'react'
import TimelineViewer from '../-SDKs/ExecutionSDK/ui/Timeline'

const BottomLeftPanel = () => {
  return (
    <div className='fixed z-100 bottom-5 left-5 flex flex-row gap-2 flex flex-row gap-2 z-10 p-0.5 rounded-xl bg-card backdrop-blur-sm border border-border shadow-md shadow-black/10'>
        <TimelineViewer/>
    </div>
  )
}

export default BottomLeftPanel
