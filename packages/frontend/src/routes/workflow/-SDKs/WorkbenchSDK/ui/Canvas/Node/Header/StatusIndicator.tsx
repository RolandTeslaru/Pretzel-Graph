import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { Tooltip } from '@pretzel-graph/standard-ui/foundations'
import type { Execution, Validation, Workflow } from '@pretzel-graph/shared/domain'
import { GlowingAlertTriangle, GlowingCompletedCheck, GlowingFailedX, GlowingRunningSpinner, GlowingWaitingClock } from './icons'

interface Props {
  nodeId: Workflow.Node.Id,
  className?: string,
  sessionStatus: Execution.Session.NodeStatus
}

const StatusIndicator = ({
  nodeId,
  className = "",
  sessionStatus
}: Props) => {
  const hasIssues = WorkbenchSDK.useStore(s => s.selectors.node.hasIssues(s, nodeId))

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

  if (sessionStatus.status === "idle")
    return null;

  if (sessionStatus.status === "running")
    return (
      <GlowingRunningSpinner />
    )
  else if (sessionStatus.status === "waiting")
    return (
      <GlowingWaitingClock />
    )
  else if (sessionStatus.status === "failed")
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className={className}>
            <GlowingFailedX />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content align="center" side="right" sideOffset={10}>
          <FailedTooltipContent error={sessionStatus.error} />
        </Tooltip.Content>
      </Tooltip.Root>
    )
  else if (sessionStatus.status === "completed") {
    return (
      <GlowingCompletedCheck />
    )
  }

  return null;
}

export default StatusIndicator

const IssuesTooltipContent = ({ nodeId }: { nodeId: Workflow.Node.Id }) => {
  const issues = WorkbenchSDK.useStore(s => s.issues.nodes[nodeId])
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



export const FailedTooltipContent = ({ error }: { error: Execution.Session.NodeStatus["error"] }) => {
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
