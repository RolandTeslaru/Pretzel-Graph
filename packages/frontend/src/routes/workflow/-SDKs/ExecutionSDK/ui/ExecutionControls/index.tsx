import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ExecutionSDK } from '../../sdk'
import Tipped from '@/components/Tipped'
import { handlePause, handleResume, handleRun, handleSuspend, handleTerminate, handleClear } from './utils'
import { AnimatePresence, motion } from 'motion/react'
import { ControlButton } from './control-button'
import { Button, Popover } from '@pretzel-graph/standard-ui/foundations'
import ExecutionHistoryPanel from '../ExecutionHistoryPanel'

const spring = { type: "spring", stiffness: 500, damping: 28 } as const

interface Props {
  canRun: boolean
}

const ExecutionControls = ({ canRun }: Props) => {

  const [currentExecution, awaitedConfirmation] = ExecutionSDK.useStore(s => [s.currentExecution, s.awaitedConfirmation]);

  let status = "idle"
  if (currentExecution) {
    const executionStatus = currentExecution.status;
    if (executionStatus === "failed" || executionStatus === "completed") {
      status = executionStatus;
    } else if (executionStatus === "paused") {
      status = "paused";
    } else if (executionStatus === "running") {
      status = "running";
    }
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={status}
        layout
        className="flex gap-1 items-center"
        initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
        transition={spring}
      >
        {status === "idle" || status === "failed" || status === "completed" ? (
          <>
            <ControlButton
              disabled={!canRun}
              loading={awaitedConfirmation.has("started")}
              icon={SystemIcons.Play}
              iconClassName="mr-auto"
              label="Run"
              variant="success"
              onClick={handleRun}
            />
          </>
        ) : null}
        {status === "running" && (
          <>
            <Tipped label="Pause">
              <ControlButton
                loading={awaitedConfirmation.has("paused")}
                icon={SystemIcons.PauseFill}
                size="icon-sm"
                iconClassName='scale-80'
                variant="ghost-warning"
                onClick={handlePause}
              />
            </Tipped>
            <Tipped label="Terminate">
              <ControlButton
                loading={awaitedConfirmation.has("terminated")}
                icon={SystemIcons.X}
                size="icon-sm"
                iconClassName='scale-80'
                variant="ghost-destructive"
                onClick={handleTerminate}
              />
            </Tipped>
          </>
        )}
        {status === "paused" && (
          <>
            <ControlButton
              loading={awaitedConfirmation.has("resumed")}
              icon={SystemIcons.Play}
              variant="ghost-success"
              size="icon-sm"
              onClick={handleResume}
            />
            <Tipped label="Suspend">
              <ControlButton
                loading={awaitedConfirmation.has("suspended")}
                icon={SystemIcons.SquareFill}
                size="icon-sm"
                iconClassName='scale-80'
                variant="ghost-warning"
                onClick={handleSuspend}
              />
            </Tipped>
            <Tipped label="Terminate">
              <ControlButton
                loading={awaitedConfirmation.has("terminated")}
                icon={SystemIcons.X}
                size="icon-sm"
                iconClassName='scale-80'
                variant="ghost-destructive"
                onClick={handleTerminate}
              />
            </Tipped>
          </>
        )}
        {currentExecution && (status === "completed" || status === "failed" || status === "terminated") && (
          <>
            <Tipped label="Clear Execution">
              <Button size="icon-sm" variant="ghost-destructive" onClick={handleClear}>
                <SystemIcons.Trash2 className='scale-80' />
              </Button>
            </Tipped>
          </>
        )}

        {(status === "running" || status === "paused") ? null : <HistoryPopoverButton />}
      </motion.div>
    </AnimatePresence>
  )
}

export default ExecutionControls


const HistoryPopoverButton = () => {
  return (
    <Tipped label="Show Execution History">
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button size="icon-sm" variant="ghost">
            <SystemIcons.History className='scale-80' />
          </Button>
        </Popover.Trigger>
        <Popover.Content className='px-0 pb-0 rounded-xl overflow-hidden'>
          <ExecutionHistoryPanel />
        </Popover.Content>
      </Popover.Root>
    </Tipped>
  )
}