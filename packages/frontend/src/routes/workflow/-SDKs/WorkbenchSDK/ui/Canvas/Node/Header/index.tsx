import React from 'react'
import { ExecutionSession, Workflow } from '@vx-agent-editor/shared/domain';
import MinimizedHandles from './MinimizedHandles';
import { LazyIcon } from '@vx-agent-editor/vx-ui/icons/LazyIcon';
import StatusIndicator from './StatusIndicator';

interface Props {
  node: Workflow.Node
  isWorkflowLocked: boolean
  executionStatus?: ExecutionSession.NodeStatus
}

export const NodeHeader: React.FC<Props> = ({ node, isWorkflowLocked, executionStatus }) => {
  const isMinimized = node.isMinimized;
  const isFlipped = node.isFlipped;
  if (isMinimized)
    return (
      <MinimizedHandles node={node} isWorkflowLocked={isWorkflowLocked} isFlipped={node.isFlipped}>
        <div className='px-4 h-fit my-auto'>
          <LazyIcon
            className={`w-10 h-10 ${isFlipped ? "scale-x-[-1]" : ""}`}
            name={node.icon as string}
            style={{ color: `var(--${node.accent}-foreground)` }}
          />
        </div>
        <div className='absolute -bottom-1 -right-5'>
          <StatusIndicator executionStatus={executionStatus} nodeId={node.id} />
        </div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 truncate text-xs font-semibold text-foreground/80">
          {node.displayName}
        </div>
      </MinimizedHandles>
    )

  return (
    <div className="flex w-full items-center gap-3 px-4 py-1 rounded-t-xl " >
      <LazyIcon
        className={`${isMinimized ? "w-8 h-8" : "w-5.5 h-5.5"} ${isFlipped ? "scale-x-[-1]" : ""}`}
        name={node.icon as string}
        style={{ color: `var(--${node.accent}-foreground)` }}
      />
      <div className="flex-1 truncate font-semibold text-foreground/80">
        {node.displayName}
      </div>
      <StatusIndicator executionStatus={executionStatus} nodeId={node.id} />

    </div>
  )
}