import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Button, Spinner } from '@/vx-ui/foundations'
import { SystemIcons } from '@/vx-ui/icons'
import { OrchestratorSDK } from '../sdk'

const handlePause = () => {
  const currentJobId = OrchestratorSDK.state.jobId;
  if (!currentJobId) return;
  OrchestratorSDK.actions.pause(currentJobId)
}

const handleTerminate = () => {
  const currentJobId = OrchestratorSDK.state.jobId;
  if (!currentJobId) return;
  OrchestratorSDK.actions.terminate(currentJobId);
}

const handleRun = () => {
  const state = WorkbenchSDK.state;
  
  OrchestratorSDK.actions.run();
}

const WorkflowControls = () => {

  const [jobId, awaitedConfirmation] = OrchestratorSDK.useStore(s => [s.jobId, s.awaitedConfirmation]);

  const isAwaitingStarted = awaitedConfirmation.has("started")
  const isAwaitingPaused = awaitedConfirmation.has("paused")
  const isAwaitingTerminated = awaitedConfirmation.has("terminated")

  return (
    <>

      {jobId === undefined ? (
        <>
          <Button disabled={isAwaitingStarted} className='my-auto w-18' variant="success" onClick={handleRun}>
            {isAwaitingStarted ? 
              <Spinner/> : 
              <>
                <SystemIcons.Play className='mr-auto'/>
                Run
              </>  
            }

          </Button>
        </>
      )
        : (
          <>
            <Button disabled={isAwaitingTerminated} className='my-auto w-26' variant="destructive" onClick={handleTerminate}>
              {isAwaitingTerminated ? 
                <Spinner/> : 
                <>
                  <SystemIcons.X className='size-4' />
                  Terminate
                </>
              }
            </Button>
            <Button disabled={isAwaitingPaused} className='my-auto w-20' variant="warning" onClick={handlePause}>
              {isAwaitingPaused ? 
                <Spinner/> : 
                <>
                  <SystemIcons.PauseFill />
                  Pause
                </>
              }
            </Button>
          </>
        )
      }
    </>
  )
}

export default WorkflowControls