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

  const hyNode = WorkbenchSDK.useNode(nodeId);

  // Handle positions (Left<->Right) flip with node.isFlipped / isMinimized.
  // XYFlow caches handle bounds, so tell it to re-measure and reroute edges.
  const updateNodeInternals = useUpdateNodeInternals()
  useEffect(() => {
    updateNodeInternals(nodeId)
  }, [nodeId, hyNode?.ui?.isFlipped, hyNode?.ui?.isMinimized, updateNodeInternals])

  if (!hyNode)
    return null;

  return <Content hyNode={hyNode} />
})

export default CanvasNode



const Content = memo(({ hyNode }: { hyNode: Workflow.Node.Hydrated }) => {

  const [isNodeClicked, hasUpdate] = WorkbenchSDK.useStore(s => [
    s.clickedNodeId === hyNode.id,
    s.selectors.dependency.doesNodeHaveUpdate(s, hyNode.id)
  ])

  const isMinimized = hyNode.ui.isMinimized;
  const isDisabled = hyNode.isDisabled

  let backgroundColor = 'var(--card)';
  let borderColor = "var(--border)";

  const executionStatus = ExecutionSDK.useStore(s => s.selectors.getNodeStatus(s, hyNode.id));

  if (hyNode.ui.accent) {
    backgroundColor = `color-mix(in srgb, var(--${hyNode.ui.accent}) 40%, var(--node-accent-base))`;
    borderColor =  `color-mix(in srgb, var(--${hyNode.ui.accent}) 50%, var(--border))`;
  }


  return (
    <>
      {/* Mount only when clicked. NodeToolbar subscribes to the viewport transform to keep
          its screen position, so an always-mounted one re-renders every node on every
          pan/zoom frame — 144 nodes → 144 re-renders/frame. */}
      {isNodeClicked && (
        <NodeToolbar isVisible position={Position.Top}>
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-200 ease-out origin-bottom">
            <NodeCustomToolbar hyNode={hyNode}/>
          </div>
        </NodeToolbar>
      )}

      <div className={cn(
          "animate-in fade-in-0 duration-200 ease-out transition-colors",
          "flex flex-col relative rounded-3xl shadow-lg shadow-black/20 dark:shadow-black/30",
          isMinimized ? "" : "w-[250px]",
          isDisabled ? "opacity-50" : "opacity-100",
        )}
        style={{ backgroundColor, borderColor, borderWidth: 2 }}
        id={hyNode.id}
      >
        <NodeHeader executionStatus={executionStatus} hyNode={hyNode} hasUpdate={hasUpdate} />

        {!isMinimized &&
          <div className='dark:bg-black/50 bg-card/80 py-2 gap-2 flex flex-col  rounded-b-[26px] rounded-t-xl shadow-md shadow-black/10 min-h-8 pzg-9f3a1c'

          >
            <NodeInputs nodeId={hyNode.id} inputs={hyNode.inputs} isFlipped={hyNode.ui.isFlipped} />
            <NodeOutputs nodeId={hyNode.id} outputs={hyNode.outputs} isFlipped={hyNode.ui.isFlipped} />
          </div>
        }

        <StatusBorder status={executionStatus?.status} backgroundColor={backgroundColor} isClicked={isNodeClicked} />

      </div>
    </>
  )
})