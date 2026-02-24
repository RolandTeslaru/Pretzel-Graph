import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Button } from '@/vx-ui/foundations'
import { SystemIcons } from '@/vx-ui/icons'
import { OrchestratorSDK } from '../sdk'

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
  const state = WorkbenchSDK.state;
  OrchestratorSDK.actions.execution.run(
    state.workflow,
    state.cache
  );
}

const WorkflowControls = () => {

  const currentJobId = OrchestratorSDK.useStore(s => s.currentJobId);

  return (
    <>

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
    </>
  )
}

export default WorkflowControls