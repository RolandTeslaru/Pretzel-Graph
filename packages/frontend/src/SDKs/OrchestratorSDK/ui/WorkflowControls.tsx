import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Button } from '@/vx-ui/foundations'
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

  const [jobId, executionStatus] = OrchestratorSDK.useStore(s => [s.jobId, s.executionStatus]);

  return (
    <>

      {jobId === undefined ? (
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
    </>
  )
}

export default WorkflowControls