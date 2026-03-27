import { memo } from 'react'
import { WorkbenchSDK } from '../../../sdk';
import { NodeHeader } from './Header';
import NodeInputs from './Inputs';
import NodeOutputs from './Outputs';

import type { NodeProps } from '@xyflow/react';
import { Workflow } from '@vx-agent-editor/shared/domain';
import { NodeToolbar, Position } from '@xyflow/react';
import { NodeCustomToolbar } from './CustomToolbar';
import { cn } from '@/utils/styleUtils';
import { ExecutionSessionSDK } from '@/SDKs/ExecutionSessionSDK/sdk';
import { StatusBorder } from './StatusBorder';

const WorkbenchNode = memo((props: NodeProps<WorkbenchSDK.NodeDriver>) => {
  const node = WorkbenchSDK.useStore(s => s.workflow.data.nodes[props.id as Workflow.Node.Id])

  if (!node)
    return null;

  return <WorkbenchNodeContent node={node} />
})

export default WorkbenchNode


const WorkbenchNodeContent = memo(({ node }: { node: Workflow.Node }) => {

  const [isNodeClicked, isWorkflowLocked] = WorkbenchSDK.useStore(
    s => [
      s.clickedNodeId === node.id,
      s.workflow.locked,
    ]
  );

  let backgroundColor = 'var(--card)';
  let borderColor = "var(--border)";

  const nodeStatus = ExecutionSessionSDK.useStore(s => s.session.node_status[node.id]);


  if (node.accent) {
    backgroundColor = `color-mix(in srgb, var(--${node.accent}) 32%, var(--card))`;
    borderColor = `color-mix(in srgb, var(--${node.accent}) 50%, var(--border))`;
  }



  return (
    <>
      <NodeToolbar isVisible={isNodeClicked} position={Position.Top}>
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-200 ease-out origin-bottom">
          <NodeCustomToolbar node={node} />
        </div>
      </NodeToolbar>

      <div className={cn(
        "animate-in fade-in-0 duration-200 ease-out p-1 transition-colors",
        "flex flex-col relative rounded-3xl shadow-lg shadow-black/20 dark:shadow-black/30",
        node.isMinimized ? "min-w-[100px]" : "w-[250px]",
      )}
        style={{ backgroundColor, borderColor, borderWidth: 2 }}
      >
        <NodeHeader executionStatus={nodeStatus} node={node} isWorkflowLocked={isWorkflowLocked} />

        {node.isMinimized === false &&
          <div className='pt-1 bg-card/80 border border-border/50 rounded-b-[22px] rounded-t-lg shadow-sm shadow-black/10'>
            <NodeInputs node={node} isWorkflowLocked={isWorkflowLocked} isFlipped={node.isFlipped} />
            <NodeOutputs node={node} isWorkflowLocked={isWorkflowLocked} isFlipped={node.isFlipped} />
          </div>
        }



        <StatusBorder status={nodeStatus?.status} backgroundColor={backgroundColor} isClicked={isNodeClicked} />

      </div>
    </>
  )
})