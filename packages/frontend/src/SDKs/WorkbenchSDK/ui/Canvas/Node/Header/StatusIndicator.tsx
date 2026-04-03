import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Popover, Tooltip } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import type { ExecutionSession, Validation, Workflow } from '@vx-agent-editor/shared/domain'
import { GlowingAlertTriangle, GlowingCompletedCheck, GlowingFailedX, GlowingRunningSpinner, GlowingWaitingClock } from './icons'


const StatusIndicator = ({
  nodeId,
  className = "",
  executionStatus
}: {
  nodeId: Workflow.Node.Id,
  className?: string,
  executionStatus?: ExecutionSession.NodeStatus
}) => {
  const hasIssues = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.doesNodeHaveIssues(s, nodeId))



  if (hasIssues)
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className={className}>
            <GlowingAlertTriangle />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content align="center" side="right" sideOffset={10}>
          <IssuesTooltipContent nodeId={nodeId} />
        </Tooltip.Content>
      </Tooltip.Root>
    )

  if (!executionStatus || executionStatus.status === "idle")
    return null;

  if (executionStatus.status === "running")
    return (
      <GlowingRunningSpinner />
    )
  else if (executionStatus.status === "waiting")
    return (
      <GlowingWaitingClock />
    )
  else if (executionStatus.status === "failed")
    return (
      <Tooltip.Root>
        <Tooltip.Trigger>
          <GlowingFailedX />
        </Tooltip.Trigger>
        <Tooltip.Content align="center" side="right" sideOffset={10}>
          <FailedTooltipContent error={executionStatus.error} />
        </Tooltip.Content>
      </Tooltip.Root>
    )
  else if (executionStatus.status === "completed") {
    return (
      <GlowingCompletedCheck />
    )
  }

  return null;
}

export default StatusIndicator

const IssuesTooltipContent = ({ nodeId }: { nodeId: Workflow.Node.Id }) => {
  const issues = WorkbenchSDK.useStore(s => s.issues[nodeId])
  if (!issues)
    return null;

  return (
    <div className=''>
      <p className="text-sm dark:text-black text-white font-semibold">Node has multiple issues:</p>
      <div className='flex flex-col pt-1 text-xs'>
        {Object.entries(issues.inputs).map(([key, issue]) => (
          <div key={key}>
            {renderInputIssueMessage(issue)}
          </div>
        ))}
        {Object.entries(issues.fields).map(([key, issue]) => (
          <div key={key}>
            {renderFieldIssueMessage(issue)}
          </div>
        ))}
      </div>
    </div>
  )
}


const renderFieldIssueMessage = (issue: Validation.Issue.Field) => {
  switch (issue.type) {
    case "missing_value":
      return <p>Field <span className='text-destructive font-semibold'>{issue.field.id}</span> is required</p>;
  }
}

const renderInputIssueMessage = (issue: Validation.Issue.Input) => {
  switch (issue.type) {
    case "missing_connection":
      return <p>Input <span className='text-destructive font-semibold'>{issue.input.id}</span> is required. Ensure it has a connection</p>;
    case "missing_value_or_connection":
      return <p>Input <span className='text-destructive font-semibold'>{issue.input.id}</span> is required. Provide a value or a connection</p>;
  }
}



export const FailedTooltipContent = ({ error }: { error: ExecutionSession.NodeStatus["error"] }) => {
  if(!error)
    return null;
  return (
    <div className=''>
      <p className="text-sm dark:text-black text-white font-semibold">Node execution failed with error code: {error.code}</p>
      <div className='flex flex-col pt-1 text-xs'>
        <p>{error.message}</p>
      
      </div>
    </div>
  )
}