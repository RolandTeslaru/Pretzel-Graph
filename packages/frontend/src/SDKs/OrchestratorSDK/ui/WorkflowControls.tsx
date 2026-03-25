import { Button, Spinner } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
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
  OrchestratorSDK.actions.run();
}

const handleResume = () => {
  const currentJobId = OrchestratorSDK.state.jobId;
  if (!currentJobId) return;
  OrchestratorSDK.actions.resume(currentJobId);
}

const handleSuspend = () => {
  const currentJobId = OrchestratorSDK.state.jobId;
  if (!currentJobId) return;
  OrchestratorSDK.actions.suspend(currentJobId);
}

const ControlButton = ({ loading, icon: Icon, iconClassName, label, ...rest }: { loading: boolean; icon: React.FC<{ className?: string }>; iconClassName?: string; label: string } & React.ComponentProps<typeof Button>) => (
  <Button disabled={loading} className='my-auto' {...rest}>
    {loading ? <Spinner /> : <><Icon className={iconClassName} />{label}</>}
  </Button>
)

const WorkflowControls = () => {

  const [jobId, awaitedConfirmation, executionStatus] = OrchestratorSDK.useStore(s => [s.jobId, s.awaitedConfirmation, s.executionStatus]);

  if (jobId === undefined) {
    return (
      <ControlButton loading={awaitedConfirmation.has("started")} icon={SystemIcons.Play} iconClassName="mr-auto" label="Run" variant="success" onClick={handleRun} />
    )
  }

  return (
    <>
      <ControlButton loading={awaitedConfirmation.has("terminated")} icon={SystemIcons.X} iconClassName="size-4" label="Terminate" variant="destructive" onClick={handleTerminate} />
      {executionStatus === "paused"
        ? <ControlButton loading={awaitedConfirmation.has("resumed")} icon={SystemIcons.Play} label="Resume" variant="warning" onClick={handleResume} />
        : <ControlButton loading={awaitedConfirmation.has("paused")} icon={SystemIcons.PauseFill} label="Pause" variant="warning" onClick={handlePause} />
      }
      <ControlButton loading={awaitedConfirmation.has("suspended")} icon={SystemIcons.Square} iconClassName="size-4" label="Suspend" variant="warning" onClick={handleSuspend} />
    </>
  )
}

export default WorkflowControls