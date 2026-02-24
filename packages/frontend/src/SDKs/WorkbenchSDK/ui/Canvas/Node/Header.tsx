import React from 'react'
import { Workflow } from '@vx-agent-editor/shared/domain';
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk';
import MinimizedHandles from './MinimizedHandles';
import { SystemIcons } from '@/vx-ui/icons';
import { LazyIcon } from '@/vx-ui/icons/LazyIcon';
import { Popover } from '@/vx-ui/foundations';


interface Props {
  node: Workflow.Node
  isWorkflowLocked: boolean
}

export const NodeHeader: React.FC<Props> = ({ node, isWorkflowLocked }) => {
  const isMinimized = node.isMinimized;

  if (isMinimized)
    return (
      <MinimizedHandles node={node} isWorkflowLocked={isWorkflowLocked}>
        <div className='flex w-full flex-col! items-center gap-1 px-4 py-1'

        >
          <LazyIcon
            className={`w-10 h-10`}
            name={node.icon as string}
            style={{ color: node.accent }}
          />
          <div className="truncate font-semibold text-foreground/80">
            {node.displayName}
          </div>
          <IssueIndicator nodeId={node.id} />
        </div>
      </MinimizedHandles>
    )

  return (
    <div
      className="flex w-full items-center gap-3 px-4 py-1 rounded-t-xl "
    >
      <LazyIcon
        className={`${isMinimized ? "w-8 h-8" : "w-5.5 h-5.5"}`}
        name={node.icon as string}
        style={{ color: node.accent }}
      />
      <div className="flex-1 truncate font-semibold text-foreground/80">
        {node.displayName}
      </div>
      <IssueIndicator nodeId={node.id} />

    </div>
  )
}


const IssueIndicator = ({ nodeId }: { nodeId: Workflow.Node.Id }) => {
  const hasIssues = WorkbenchSDK.useNodeHasIssues(nodeId);
  if (!hasIssues)
    return null;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <SystemIcons.PingingAlertTriangle size={22} className='text-red-500 cursor-pointer' />
      </Popover.Trigger>
      <Popover.Content align="center" side="right" sideOffset={10}>
        <IssuesPopupContent nodeId={nodeId} />
      </Popover.Content>
    </Popover.Root>
  )
}

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


const renderFieldIssueMessage = (issue: Workflow.Issue.Field) => {
  switch (issue.type) {
    case "missing_value":
      return <p>Field <span className='text-destructive font-semibold'>{issue.field.id}</span> is required</p>;
  }
}

const renderInputIssueMessage = (issue: Workflow.Issue.Input) => {
  switch (issue.type) {
    case "missing_connection":
      return <p>Input <span className='text-destructive font-semibold'>{issue.input.id}</span> is required. Ensure it has a connection</p>;
    case "missing_value_or_connection":
      return <p>Input <span className='text-destructive font-semibold'>{issue.input.id}</span> is required. Provide a value or a connection</p>;
  }
}
