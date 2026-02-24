import React from 'react'
import { Workflow } from '@vx-agent-editor/shared/domain';
import MinimizedHandles from './MinimizedHandles';
import { LazyIcon } from '@/vx-ui/icons/LazyIcon';
import StatusIndicator from './StatusIndicator';

interface Props {
  node: Workflow.Node
  isWorkflowLocked: boolean
}

export const NodeHeader: React.FC<Props> = ({ node, isWorkflowLocked }) => {
  const isMinimized = node.isMinimized;

  if (isMinimized)
    return (
      <MinimizedHandles node={node} isWorkflowLocked={isWorkflowLocked}>
        <div className='flex w-full flex-col! items-center gap-1 px-4 py-1 relative'

        >
          <LazyIcon
            className={`w-10 h-10`}
            name={node.icon as string}
            style={{ color: node.accent }}
          />
          <div className="truncate font-semibold text-foreground/80">
            {node.displayName}
          </div>
          <StatusIndicator nodeId={node.id} className='absolute top-0 right-0'/>
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
      <StatusIndicator nodeId={node.id}/>

    </div>
  )
}