import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Popover } from '@/vx-ui/foundations'
import { SystemIcons } from '@/vx-ui/icons'
import type { Validation, Workflow } from '@vx-agent-editor/shared/domain'


const StatusIndicator = ({
  nodeId,
  className = ""
}: {
  nodeId: Workflow.Node.Id,
  className?: string
}) => {
  const hasIssues = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.doesNodeHaveIssues(s, nodeId))


  if (hasIssues === false)
    return null

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <div className={className}>
          <SystemIcons.PingingAlertTriangle size={22} className={'text-red-500 cursor-pointer '} />
        </div>
      </Popover.Trigger>
      <Popover.Content align="center" side="right" sideOffset={10}>
        <IssuesPopupContent nodeId={nodeId} />
      </Popover.Content>
    </Popover.Root>
  )
}

export default StatusIndicator

const IssuesPopupContent = ({ nodeId }: { nodeId: Workflow.Node.Id }) => {
  const issues = WorkbenchSDK.useStore(s => s.issues[nodeId])
  if (!issues)
    return null;

  return (
    <div className='p-1'>
      <p className="text-md font-mono text-foreground font-semibold">Node has multiple issues:</p>
      <div className='flex flex-col p-1 text-sm'>
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
