import React from 'react'
import { Workflow } from '@vx-agent-editor/shared/types';
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk';
import MinimizedHandles from './MinimizedHandles';
import { SystemIcons } from '@/vx-ui/icons';

const WindowSizeButton = ({ node }: { node: Workflow.Node }) => {
  const isMinimized = node.data.ui.isMinimized;
  return (
    <button className='p-0  cursor-pointer  rounded-md hover:bg-muted'
      onClick={() => {
        WorkbenchSDK.actions.node.setMinimized(node.id, !isMinimized);
      }}
    >
      {isMinimized ?
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
  const isMinimized = node.data.ui.isMinimized;

  return (
    <>

      {isMinimized ?
        <MinimizedHandles node={node} isWorkflowLocked={isWorkflowLocked}>
          <div className='flex w-full items-center gap-3 px-4 py-1.5'>
            {/* <NodeIcon
              className={`${isMinimized ? "w-8 h-8" : "w-5.5 h-5.5"}`}
              dataType={node.data.ui.icon as string}
            /> */}
            <div className="flex-1 truncate font-medium text-foreground">
              {node.display_name}
            </div>

            <WindowSizeButton node={node} />
          </div>
        </MinimizedHandles>
        :
        <div className="flex w-full items-center gap-3 px-4 py-1.5 bg-input/30 rounded-t-xl">
          {/* <NodeIcon
            className={`${isMinimized ? "w-8 h-8" : "w-5.5 h-5.5"}`}
            dataType={node.data.ui.icon as string}
          /> */}
          <div className="flex-1 truncate font-medium text-foreground">
            {node.display_name}
          </div>

          <WindowSizeButton node={node} />
        </div>
      }

    </>
  )
}