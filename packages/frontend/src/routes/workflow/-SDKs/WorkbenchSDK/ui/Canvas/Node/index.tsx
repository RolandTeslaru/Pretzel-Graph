import { memo, useEffect } from 'react'
import { useUpdateNodeInternals } from '@xyflow/react'
import { WorkbenchSDK } from '../../../sdk';
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk';
import { NodeHeader } from './Header';
import NodeInputs from './Inputs';
import NodeOutputs from './Outputs';

import type { NodeProps } from '@xyflow/react';
import { Workflow } from '@pretzel-graph/shared/domain';
import { NodeToolbar, Position } from '@xyflow/react';
import { NodeCustomToolbar } from './CustomToolbar';
import { cn } from '@/utils/styleUtils';
import { StatusBorder } from './StatusBorder';
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk';

const CanvasNode = memo((props: NodeProps<WorkbenchSDK.NodeDriver>) => {
  const node = WorkbenchSDK.useStore(s => s.data.nodes[props.id as Workflow.Node.Id])

  // Handle positions (Left<->Right) flip with node.isFlipped / isMinimized.
  // XYFlow caches handle bounds, so tell it to re-measure and reroute edges.
  const updateNodeInternals = useUpdateNodeInternals()
  useEffect(() => {
    updateNodeInternals(props.id)
  }, [props.id, node?.isFlipped, node?.isMinimized, updateNodeInternals])

  if (!node)
    return null;

  return <Content node={node} />
})

export default CanvasNode


const Content = memo(({ node }: { node: Workflow.Node }) => {

  const [workflowId, isNodeClicked, hasUpdate] = WorkbenchSDK.useStore(s => [
    s.workflowId,
    s.clickedNodeId === node.id,
    s.selectors.dependency.doesNodeHaveUpdate(s, node.id)
  ])

  const isWorkflowLocked = LibrarySDK.useStore(s => s.workflowMetas[workflowId]?.locked ?? false);

  const isMinimized = node.isMinimized;
  const isDisabled = node.isDisabled

  let backgroundColor = 'var(--card)';
  let borderColor = "var(--border)";

  const executionStatus = ExecutionSDK.useStore(s => s.selectors.getNodeStatus(s, node.id));

  if (node.accent) {
    backgroundColor = `color-mix(in srgb, var(--${node.accent}) 40%, var(--node-accent-base))`;
    borderColor =  `color-mix(in srgb, var(--${node.accent}) 50%, var(--border))`;
  }



  return (
    <>
      <NodeToolbar isVisible={isNodeClicked} position={Position.Top}>
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-200 ease-out origin-bottom">
          <NodeCustomToolbar node={node} />
        </div>
      </NodeToolbar>

      <div className={cn(
          "animate-in fade-in-0 duration-200 ease-out transition-colors",
          "flex flex-col relative rounded-3xl shadow-lg shadow-black/20 dark:shadow-black/30",
          isMinimized ? "" : "w-[250px]",
          isDisabled ? "opacity-50" : "opacity-100",
        )}
        style={{ backgroundColor, borderColor, borderWidth: 2 }}
        id={node.id}
      >
        <NodeHeader executionStatus={executionStatus} node={node} isWorkflowLocked={isWorkflowLocked} hasUpdate={hasUpdate} />

        {node.isMinimized === false &&
          <div className='dark:bg-black/50 bg-card/70 py-2 gap-2 flex flex-col  rounded-b-[26px] rounded-t-xl shadow-md shadow-black/10 min-h-8'
            
          >
            <NodeInputs node={node} isWorkflowLocked={isWorkflowLocked} isFlipped={node.isFlipped} />
            <NodeOutputs node={node} isWorkflowLocked={isWorkflowLocked} isFlipped={node.isFlipped} />
          </div>
        }

        <StatusBorder status={executionStatus?.status} backgroundColor={backgroundColor} isClicked={isNodeClicked} />

      </div>
    </>
  )
})