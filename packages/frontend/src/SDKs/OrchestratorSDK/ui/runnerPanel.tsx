import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Button } from '@/vx-ui/foundations'
import { SystemIcons } from '@/vx-ui/icons'
import React, { useCallback } from 'react'
import { OrchestratorSDK } from '../sdk'

const execution = OrchestratorSDK.actions.execution

const RunnerPanel = () => {

  const currentJob = OrchestratorSDK.useStore(s => s.currentJob);

  const handleRun = useCallback(() => {
    const workflow = WorkbenchSDK.state.workflow;
    debugger
    execution.run(workflow);
  }, [])

  const handlePause = useCallback(() => {
    if (!currentJob) return;
    execution.pause(currentJob.id);
  },[currentJob])

  const handleTerminate = useCallback(() => {
    if (!currentJob) return;
    execution.terminate(currentJob.id);
  },[currentJob])

  return (
    <div className='flex flex-row p-1 gap-2 rounded-xl bg-card/70 backdrop-blur-sm border border-border fixed bottom-5 left-1/2 translate-x-1/2 z-10'>
        <Button className='my-auto' variant="success" onClick={handleRun}>
          <SystemIcons.Play />
          Run
        </Button>
        <Button className='my-auto' variant="destructive" onClick={handleTerminate}>
          <SystemIcons.X className='size-4'/>
          Terminate
        </Button>
        <Button className='my-auto' variant="warning" onClick={handlePause}>
          <SystemIcons.PauseFill />
          Pause
        </Button>
    </div>
  )
}

export default RunnerPanel