import React from 'react'
import { Execution, Workflow } from '@pretzel-graph/shared/domain';
import MinimizedHandles from './MinimizedHandles';
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon';
import StatusIndicator from './StatusIndicator';

interface Props {
  node: Workflow.Node
  isWorkflowLocked: boolean
  executionStatus: Execution.Session.NodeStatus
  hasUpdate: boolean
}

export const NodeHeader: React.FC<Props> = ({ node, isWorkflowLocked, executionStatus, hasUpdate }) => {
  const isMinimized = node.isMinimized;
  const isFlipped = node.isFlipped;
  const iconColor = node.iconColor
    ? `var(--${node.iconColor})`
    : `var(--${node.accent}-foreground)`;

    
  if (isMinimized)
    return (
      <MinimizedHandles node={node} isWorkflowLocked={isWorkflowLocked} isFlipped={node.isFlipped}>
        <div className='px-5 py-1 h-fit my-auto'>
          <LazyIcon
            className={`w-11 h-11 ${isFlipped ? "scale-x-[-1]" : ""}`}
            name={node.icon as string}
            style={{ color: iconColor }}
          />
        </div>
        <div className='absolute -bottom-1 -right-5'>
          <StatusIndicator executionStatus={executionStatus} nodeId={node.id} hasUpdate={hasUpdate} />
        </div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 truncate text-xs font-semibold text-foreground/80">
          {node.displayName}
        </div>
      </MinimizedHandles>
    )

  return (
    <div className="flex w-full items-center gap-3 px-5 py-1.5 rounded-t-xl " >
      <LazyIcon
        className={`${isMinimized ? "w-8 h-8" : "w-5.5 h-5.5"} ${isFlipped ? "scale-x-[-1]" : ""}`}
        name={node.icon as string}
        style={{ color: iconColor }}
      />
      <div className="flex-1 truncate font-semibold text-foreground/80">
        {node.displayName}
      </div>
      <StatusIndicator executionStatus={executionStatus} nodeId={node.id} hasUpdate={hasUpdate} />

    </div>
  )
}