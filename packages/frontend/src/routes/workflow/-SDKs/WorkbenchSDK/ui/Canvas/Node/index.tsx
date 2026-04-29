import { memo } from 'react'
import { WorkbenchSDK } from '../../../sdk';
import { NodeHeader } from './Header';
import NodeInputs from './Inputs';
import NodeOutputs from './Outputs';

import type { NodeProps } from '@xyflow/react';
import { Workflow } from '@pretzel-graph/shared/domain';
import { NodeToolbar, Position } from '@xyflow/react';
import { NodeCustomToolbar } from './CustomToolbar';
import { cn } from '@/utils/styleUtils';
import { ExecutionSessionSDK } from '@/routes/workflow/-SDKs/ExecutionSessionSDK/sdk';
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

  const isMinimized = node.isMinimized;
  const isDisabled = node.isDisabled

  let backgroundColor = 'var(--card)';
  let borderColor = "var(--border)";

  const nodeStatus = ExecutionSessionSDK.useStore(s => s.session.node_status?.[node.id]);

  const isStatusComplete = nodeStatus && nodeStatus.status === "completed"

  const completedBorder = `color-mix(in srgb, var(--status-success) 80%, var(--border))`;

  if (node.accent) {
    backgroundColor = `color-mix(in srgb, var(--${node.accent}) 40%, var(--node-accent-base))`;
    borderColor = isStatusComplete ? completedBorder : `color-mix(in srgb, var(--${node.accent}) 50%, var(--border))`;
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
          isMinimized ? "" : "w-[250px]",
          isDisabled ? "opacity-50" : "opacity-100",
        )}
        style={{ backgroundColor, borderColor, borderWidth: 2 }}
        id={node.id}
      >
        <NodeHeader executionStatus={nodeStatus} node={node} isWorkflowLocked={isWorkflowLocked} />

        {node.isMinimized === false &&
          <div className='bg-card/80 py-2 border gap-2 flex flex-col border-border/50 rounded-b-[22px] rounded-t-lg shadow-sm shadow-black/10 min-h-8'>
            <NodeInputs node={node} isWorkflowLocked={isWorkflowLocked} isFlipped={node.isFlipped} />
            <NodeOutputs node={node} isWorkflowLocked={isWorkflowLocked} isFlipped={node.isFlipped} />
          </div>
        }

        <StatusBorder status={nodeStatus?.status} backgroundColor={backgroundColor} isClicked={isNodeClicked} />

      </div>
    </>
  )
})