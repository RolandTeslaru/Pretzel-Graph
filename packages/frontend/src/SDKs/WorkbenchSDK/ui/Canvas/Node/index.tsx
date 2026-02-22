import { memo, useEffect, useRef } from 'react'
import { WorkbenchSDK } from '../../../sdk';
import { NodeHeader } from './Header';
import NodeInputs from './Inputs';
import NodeOutputs from './Outputs';

import type { NodeProps } from '@xyflow/react';
import { Workflow } from '@vx-agent-editor/shared/domain';
import { NodeToolbar, Position } from '@xyflow/react';
import { NodeCustomToolbar } from './CustomToolbar';

const WorkbenchNode = memo((props: NodeProps<WorkbenchSDK.NodeDriver>) => {
  const node = WorkbenchSDK.useStore(s => s.workflow.data.nodes[props.id as Workflow.Node.Id])

  if (!node)
    return null;

  return <WorkbenchNodeContent node={node} />
})

export default WorkbenchNode


const WorkbenchNodeContent = memo(({ node }: { node: Workflow.Node }) => {
  const isNodeClicked = WorkbenchSDK.useStore(s => s.clickedNodeId === node.id);
  const isWorkflowLocked = WorkbenchSDK.useStore(s => s.workflow.locked);

  const isMinimized = node.isMinimized;

  return (
    <>
      <NodeToolbar isVisible={isNodeClicked} position={Position.Top}>
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-200 ease-out origin-bottom">
          <NodeCustomToolbar node={node} />
        </div>
      </NodeToolbar>
      <div className={` ${isMinimized ? "min-w-[100px]" : "w-[250px]"}
        flex flex-col bg-card/80 relative rounded-3xl border-2 border-border shadow-lg shadow-black/0 dark:shadow-black/30
        ${isNodeClicked ? "ring-3 ring-primary/30 ring-offset-4 ring-offset-background" : ""}
        `}
      >
        <NodeHeader node={node} isWorkflowLocked={isWorkflowLocked} />
        {isMinimized === false &&
          <>
            <NodeInputs node={node} isWorkflowLocked={isWorkflowLocked} />
            <NodeOutputs node={node} isWorkflowLocked={isWorkflowLocked} />
          </>
        }
      </div>
    </>
  )
})