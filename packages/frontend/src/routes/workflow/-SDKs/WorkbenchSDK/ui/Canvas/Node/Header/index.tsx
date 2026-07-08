import React from 'react'
import { Execution, Workflow } from '@pretzel-graph/shared/domain';
import MinimizedHandles from './MinimizedHandles';
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon';
import StatusIndicator from './StatusIndicator';
import type { NodeUI } from '../../../../selectors/node';

interface Props {
  hyNode: Workflow.Node.Hydrated
  executionStatus: Execution.Session.NodeStatus
  hasUpdate: boolean
}

export const NodeHeader: React.FC<Props> = ({ hyNode, executionStatus, hasUpdate }) => {
  const { ui, id: nodeId } = hyNode;
  const isMinimized = ui.isMinimized;
  const isFlipped = ui.isFlipped;
  const iconColor = ui.iconColor
    ? `var(--${ui.iconColor})`
    : `var(--${ui.accent}-foreground)`;

    
  if (isMinimized)
    return (
      <MinimizedHandles inputs={hyNode.inputs} outputs={hyNode.outputs} nodeId={nodeId} isFlipped={isFlipped}>
        <div className='px-5 py-1 h-fit my-auto'>
          <LazyIcon
            className={`w-11 h-11 ${isFlipped ? "scale-x-[-1]" : ""}`}
            name={ui.icon ?? ""}
            style={{ color: iconColor }}
          />
        </div>
        <div className='absolute -bottom-1 -right-5'>
          <StatusIndicator executionStatus={executionStatus} nodeId={nodeId} hasUpdate={hasUpdate} />
        </div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 truncate text-xs font-semibold text-foreground/80">
          {ui.displayName}
        </div>
      </MinimizedHandles>
    )

  return (
    <div className="flex w-full items-center gap-3 px-5 py-1.5 rounded-t-xl " >
      <LazyIcon
        className={`${isMinimized ? "w-8 h-8" : "w-5.5 h-5.5"} ${isFlipped ? "scale-x-[-1]" : ""}`}
        name={ui.icon ?? ""}
        style={{ color: iconColor }}
      />
      <div className="flex-1 truncate font-semibold text-foreground/80">
        {ui.displayName}
      </div>
      <StatusIndicator executionStatus={executionStatus} nodeId={nodeId} hasUpdate={hasUpdate} />

    </div>
  )
}