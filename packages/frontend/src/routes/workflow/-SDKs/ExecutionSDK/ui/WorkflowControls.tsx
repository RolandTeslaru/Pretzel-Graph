import { Button, Spinner, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ExecutionSDK } from '../sdk'

const handlePause = () => {
  const currentExecution = ExecutionSDK.state.currentExecution;
  if (!currentExecution) return;
  ExecutionSDK.actions.pause(currentExecution.id)
}

const handleTerminate = () => {
  const currentExecution = ExecutionSDK.state.currentExecution;
  if (!currentExecution) return;
  ExecutionSDK.actions.terminate(currentExecution.id)
}

const handleRun = () => {
  ExecutionSDK.actions.run();
}

const handleResume = () => {
  const currentExecution = ExecutionSDK.state.currentExecution;
  if (!currentExecution) return;
  ExecutionSDK.actions.resume(currentExecution.id);
}

const handleSuspend = () => {
  const currentExecution = ExecutionSDK.state.currentExecution;
  if (!currentExecution) return;
  ExecutionSDK.actions.suspend(currentExecution.id);
}

const ControlButton = ({ loading, icon: Icon, iconClassName, label, ...rest }: { loading: boolean; icon: React.FC<{ className?: string }>; iconClassName?: string; label?: string } & React.ComponentProps<typeof Button>) => (
  <Button disabled={loading} className='my-auto' {...rest}>
    {loading ? <Spinner /> : <><Icon className={iconClassName} />{label}</>}
  </Button>
)

const WorkflowControls = ({ canRun }: { canRun: boolean }) => {

  const [currentExecution, awaitedConfirmation] = ExecutionSDK.useStore(s => [s.currentExecution, s.awaitedConfirmation]);

  if (!currentExecution) {
    return (
      <ControlButton disabled={!canRun} loading={awaitedConfirmation.has("started")} icon={SystemIcons.Play} iconClassName="mr-auto" label="Run" variant="success" onClick={handleRun} />
    )
  }

  return (
    <>
      {currentExecution.status === "paused"
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