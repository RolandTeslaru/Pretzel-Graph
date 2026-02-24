import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Button } from '@/vx-ui/foundations'
import { SystemIcons } from '@/vx-ui/icons'
import { useCallback } from 'react'
import { OrchestratorSDK } from '../sdk'
import type { Orchestrator } from '@vx-agent-editor/shared/domain'

const handlePause = () => {
  const currentJobId = OrchestratorSDK.state.currentJobId;
  if (!currentJobId) return;
  OrchestratorSDK.actions.execution.pause(currentJobId);
}

const handleTerminate = () => {
  const currentJobId = OrchestratorSDK.state.currentJobId;
  if (!currentJobId) return;
  OrchestratorSDK.actions.execution.terminate(currentJobId);
}

const handleRun = () => {
  const workflow = WorkbenchSDK.state.workflow;
  OrchestratorSDK.actions.execution.run(workflow);
}

const RunnerPanel = () => {

  const currentJobId = OrchestratorSDK.useStore(s => s.currentJobId);

  OrchestratorSDK.useJobEvents(currentJobId || "" as Orchestrator.Job.Id, (event) => {
    switch (event.type) {
      case "job:started":
        OrchestratorSDK.setState(s => s.currentJobId = event.jobId)
        break;
      case "job:update":
        // @ts-expect-error
        OrchestratorSDK.setState(s => s.graphState = event.update)
        break;
      case "job:completed":
        OrchestratorSDK.setState(s => s.currentJobId = undefined)
        break;
    }
  })

  return (
    <div className='flex flex-row p-1 gap-2 rounded-2xl bg-card/70 backdrop-blur-sm border border-border fixed bottom-5 left-1/2 -translate-x-1/2 z-10'>

      {currentJobId === undefined ? (
        <>
          <Button className='my-auto' variant="success" onClick={handleRun}>
            <SystemIcons.Play />
            Run
          </Button>
        </>
      )
        : (
          <>
            <Button className='my-auto' variant="destructive" onClick={handleTerminate}>
              <SystemIcons.X className='size-4' />
              Terminate
            </Button>
            <Button className='my-auto' variant="warning" onClick={handlePause}>
              <SystemIcons.PauseFill />
              Pause
            </Button>
          </>
        )
      }
    </div>
  )
}

export default RunnerPanel