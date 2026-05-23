import React from 'react'
import { DrawerSDK } from '../-SDKs/DrawerSDK/sdk'
import { Button } from '@pretzel-graph/standard-ui/foundations';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';

const BottomLeftPanel = () => {

  const isDrawerOpen = DrawerSDK.useStore(s => s.isOpen);

  return (
    <div className='absolute z-20 bottom-5 left-5 flex flex-row gap-2 flex flex-row gap-2 z-10 p-0.5 rounded-xl bg-card backdrop-blur-sm border border-border shadow-md shadow-black/10 '>
    
      <Button variant={"ghost"} size="icon-sm"
        onClick={() => {
          DrawerSDK.actions.toggle();
        }}
      >
        <SystemIcons.ChevronRight
          className={` *:transition-transform ${isDrawerOpen ? 'rotate-90' : ''} `}

        />
      </Button>
    </div>
  )
}

export default BottomLeftPanel
