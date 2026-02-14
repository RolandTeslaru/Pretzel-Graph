import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Button } from '@/vx-ui/foundations'
import { SystemIcons } from '@/vx-ui/icons'
import { useCallback } from 'react'
import { OrchestratorSDK } from '../sdk'
import type { Orchestrator } from '@vx-agent-editor/shared/types'


const RunnerPanel = () => {

  const currentJobId = OrchestratorSDK.useStore(s => s.currentJobId);

  const handleRun = useCallback(() => {
    const workflow = WorkbenchSDK.state.workflow;
    OrchestratorSDK.actions.execution.run(workflow);
  }, [])

  const handlePause = useCallback(() => {
    if (!currentJobId) return;
    OrchestratorSDK.actions.execution.pause(currentJobId);
  }, [currentJobId])

  const handleTerminate = useCallback(() => {
    if (!currentJobId) return;
    OrchestratorSDK.actions.execution.terminate(currentJobId);
  }, [currentJobId])

  OrchestratorSDK.useJobEvents(currentJobId || "" as Orchestrator.Job.Id, (event) => {
    if (event.type === "job:started") {
      OrchestratorSDK.setState(s => s.currentJobId = event.jobId)
    }
    if (event.type === "job:update") {
      OrchestratorSDK.setState(s => s.graphState = event.update)
    }
    if (event.type === "job:completed") {
      OrchestratorSDK.setState(s => s.currentJobId = undefined)
    }
  })

  return (
    <div className='flex flex-row p-1 gap-2 rounded-xl bg-card/70 backdrop-blur-sm border border-border fixed bottom-5 left-1/2 -translate-x-1/2 z-10'>

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