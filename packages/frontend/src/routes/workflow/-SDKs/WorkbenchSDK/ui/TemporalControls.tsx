import { Button } from '@pretzel-graph/standard-ui/foundations'
import { useStore } from 'zustand'

import { WorkbenchSDK } from '../sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import Tipped from '@/components/Tipped'

const TemporalControls = () => {
  const temporalStore = (WorkbenchSDK.useStore as any).temporal;

  // Reactively subscribe to the temporal store
  const canUndo = useStore(temporalStore, (state: any) => state.pastStates.length > 0);
  const canRedo = useStore(temporalStore, (state: any) => state.futureStates.length > 0);

  return (
    <div className="flex gap-2">
      <Tipped label="Undo">
        <Button
          disabled={!canUndo}
          onClick={WorkbenchSDK.actions.temporal.undo}
          variant={"ghost"}
          size={"icon-sm"}
        >
          <SystemIcons.Undo/>
        </Button>
      </Tipped>
      <Tipped label="Redo">
        <Button
          disabled={!canRedo}
          onClick={WorkbenchSDK.actions.temporal.redo}
          variant={"ghost"}
          size={"icon-sm"}
        >
          <SystemIcons.Redo/>
        </Button>
      </Tipped>
    </div>
  )
}

export default TemporalControls
