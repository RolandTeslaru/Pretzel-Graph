import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import React from 'react'

const IncomingPanel = () => {
  return (
    <div className='p-2 h-full'>
      <div className='bg-card border border-border rounded-full p-1 flex flex-row gap-2 shadow-md shadow-black/10'>
        <SystemIcons.LogIn size={20}/>
        <p className='h-auto my-auto text-sm'>Incoming Data</p>
      </div>
    </div>
  )
}

export default IncomingPanel
