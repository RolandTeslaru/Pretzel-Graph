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
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk';

const CanvasNode = memo((props: NodeProps<WorkbenchSDK.NodeDriver>) => {
  const nodeId = props.id as Workflow.Node.Id;

  const node = WorkbenchSDK.useStore(s => s.data.nodes[nodeId]);

  // Handle positions (Left<->Right) flip with node.isFlipped / isMinimized.
  // XYFlow caches handle bounds, so tell it to re-measure and reroute edges.
  const updateNodeInternals = useUpdateNodeInternals()
  useEffect(() => {
    updateNodeInternals(nodeId)
  }, [nodeId, node?.ui?.isFlipped, node?.ui?.isMinimized, updateNodeInternals])

  if (!node)
    return null;

  return <Content nodeId={nodeId} />
})

export default CanvasNode



const Content = memo(({ nodeId }: { nodeId: Workflow.Node.Id }) => {

  const [node, blueprint, ui] = WorkbenchSDK.useNode(nodeId);

  const [workflowId, isNodeClicked, hasUpdate] = WorkbenchSDK.useStore(s => [
    s.workflowId,
    s.clickedNodeId === node.id,
    s.selectors.dependency.doesNodeHaveUpdate(s, node.id)
  ])

  const isWorkflowLocked = LibrarySDK.useStore(s => s.workflowMetas[workflowId]?.locked ?? false);

  const isMinimized = ui.isMinimized;
  const isDisabled = node.isDisabled

  let backgroundColor = 'var(--card)';
  let borderColor = "var(--border)";

  const executionStatus = ExecutionSDK.useStore(s => s.selectors.getNodeStatus(s, node.id));

  if (ui.accent) {
    backgroundColor = `color-mix(in srgb, var(--${ui.accent}) 40%, var(--node-accent-base))`;
    borderColor =  `color-mix(in srgb, var(--${ui.accent}) 50%, var(--border))`;
  }


  return (
    <>
      <NodeToolbar isVisible={isNodeClicked} position={Position.Top}>
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-200 ease-out origin-bottom">
          <NodeCustomToolbar node={node} blueprint={blueprint} />
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
        <NodeHeader executionStatus={executionStatus} ui={ui} node={node} isWorkflowLocked={isWorkflowLocked} hasUpdate={hasUpdate} />

        {!isMinimized &&
          <div className='dark:bg-black/50 bg-card/80 py-2 gap-2 flex flex-col  rounded-b-[26px] rounded-t-xl shadow-md shadow-black/10 min-h-8 pzg-9f3a1c'

          >
            <NodeInputs nodeId={node.id} isWorkflowLocked={isWorkflowLocked} isFlipped={ui.isFlipped} />
            <NodeOutputs nodeId={node.id} isWorkflowLocked={isWorkflowLocked} isFlipped={ui.isFlipped} />
          </div>
        }

        <StatusBorder status={executionStatus?.status} backgroundColor={backgroundColor} isClicked={isNodeClicked} />

      </div>
    </>
  )
})