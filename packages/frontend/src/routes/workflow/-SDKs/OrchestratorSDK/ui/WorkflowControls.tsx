import { Button, Spinner, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
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

const ControlButton = ({ loading, icon: Icon, iconClassName, label, ...rest }: { loading: boolean; icon: React.FC<{ className?: string }>; iconClassName?: string; label?: string } & React.ComponentProps<typeof Button>) => (
  <Button disabled={loading} className='my-auto' {...rest}>
    {loading ? <Spinner /> : <><Icon className={iconClassName} />{label}</>}
  </Button>
)

const WorkflowControls = ({ canRun }: { canRun: boolean }) => {

  const [jobId, awaitedConfirmation, executionStatus] = OrchestratorSDK.useStore(s => [s.jobId, s.awaitedConfirmation, s.executionStatus]);

  if (jobId === undefined) {
    return (
      <ControlButton disabled={!canRun} loading={awaitedConfirmation.has("started")} icon={SystemIcons.Play} iconClassName="mr-auto" label="Run" variant="success" onClick={handleRun} />
    )
  }

  return (
    <>
      {executionStatus === "paused"
        ? <ControlButton loading={awaitedConfirmation.has("resumed")} icon={SystemIcons.Play} label="Resume" variant="warning" onClick={handleResume} />
        : <Tooltip.Root>
            <Tooltip.Trigger>
              <ControlButton loading={awaitedConfirmation.has("paused")} icon={SystemIcons.PauseFill} variant="warning" onClick={handlePause} />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Pause</p>
            </Tooltip.Content>
          </Tooltip.Root>
      }
      <Tooltip.Root>
        <Tooltip.Trigger>
          <ControlButton loading={awaitedConfirmation.has("suspended")} icon={SystemIcons.SquareFill} iconClassName="size-4" variant="warning" onClick={handleSuspend} />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Suspend</p>
        </Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <ControlButton loading={awaitedConfirmation.has("terminated")} icon={SystemIcons.X} iconClassName="size-4" variant="destructive" onClick={handleTerminate} />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Terminate</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </>
  )
}

export default WorkflowControls