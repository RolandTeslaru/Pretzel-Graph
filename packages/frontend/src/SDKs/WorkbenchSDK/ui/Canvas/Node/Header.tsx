import React from 'react'
import { Workflow } from '@vx-agent-editor/shared/domain';
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk';
import MinimizedHandles from './MinimizedHandles';
import { SystemIcons } from '@/vx-ui/icons';
import { LazyIcon } from '@/vx-ui/icons/LazyIcon';

const WindowSizeButton = ({ node }: { node: Workflow.Node }) => {
  return (
    <button className='p-0  cursor-pointer  rounded-md hover:bg-muted'
      onClick={() => {
        WorkbenchSDK.actions.node.setMinimized(node.id, !node.isMinimized);
      }}
    >
      {node.isMinimized ?
        <SystemIcons.Maximize2 className='h-5 w-5' />
        :
        <SystemIcons.Minimize2 className='h-5 w-5' />
      }
    </button>
  )
}


interface Props {
  node: Workflow.Node
  isWorkflowLocked: boolean
}

export const NodeHeader: React.FC<Props> = ({ node, isWorkflowLocked }) => {
  const isMinimized = node.isMinimized;

  return (
    <>

      {isMinimized ?
        <MinimizedHandles node={node} isWorkflowLocked={isWorkflowLocked}>
          <div className='flex w-full items-center gap-3 px-4 py-1.5'>
            <LazyIcon
              className={`${isMinimized ? "w-8 h-8" : "w-5.5 h-5.5"}`}
              name={node.icon as string}
            />
            <div className="flex-1 truncate font-medium text-foreground">
              {node.displayName}
            </div>

          </div>
        </MinimizedHandles>
        :
        <div className="flex w-full items-center gap-3 px-4 py-1.5 bg-input/30 rounded-t-xl">
          <LazyIcon
            className={`${isMinimized ? "w-8 h-8" : "w-5.5 h-5.5"}`}
            name={node.icon as string}
          />
          <div className="flex-1 truncate font-medium text-foreground">
            {node.displayName}
          </div>

        </div>
      }

    </>
  )
}