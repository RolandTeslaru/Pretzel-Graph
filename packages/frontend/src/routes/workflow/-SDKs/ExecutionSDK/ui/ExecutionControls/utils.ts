import { ExecutionSDK } from '../../sdk'

export const handleRun = () => {
  ExecutionSDK.actions.run();
}

export const handlePause = () => {
  const currentExecution = ExecutionSDK.state.currentExecution;
  if (!currentExecution) return;
  ExecutionSDK.actions.pause(currentExecution.id)
}

export const handleResume = () => {
  const currentExecution = ExecutionSDK.state.currentExecution;
  if (!currentExecution) return;
  ExecutionSDK.actions.resume(currentExecution.id);
}

export const handleSuspend = () => {
  const currentExecution = ExecutionSDK.state.currentExecution;
  if (!currentExecution) return;
  ExecutionSDK.actions.suspend(currentExecution.id);
}

export const handleTerminate = () => {
  const currentExecution = ExecutionSDK.state.currentExecution;
  if (!currentExecution) return;
  ExecutionSDK.actions.terminate(currentExecution.id)
}

export const handleClear = () => {
  ExecutionSDK.actions.clear()
}
