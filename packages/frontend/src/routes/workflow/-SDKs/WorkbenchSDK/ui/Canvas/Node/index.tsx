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
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import Tipped from '@/components/Tipped';

const CanvasNode = memo((props: NodeProps<WorkbenchSDK.NodeDriver>) => {
  const nodeId = props.id as Workflow.Node.Id;

  const hyNode = WorkbenchSDK.useNode(nodeId);

  // Handle positions flip with node.isFlipped / isMinimized, and handles themselves change
  // when the resolved port shape changes (e.g. a tool-mode derivative swaps every output for a
  // single Tool port). XYFlow caches handle bounds per node, so tell it to re-measure and
  // reroute edges whenever any of that changes — otherwise new/moved handles are invisible
  // to connection dragging even though they've already rendered.
  const updateNodeInternals = useUpdateNodeInternals()
  useEffect(() => {
    updateNodeInternals(nodeId)
  }, [nodeId, hyNode?.ui?.isFlipped, hyNode?.ui?.isMinimized, hyNode?.inputs, hyNode?.outputs, updateNodeInternals])

  if (!hyNode)
    return null;

  return <Content hyNode={hyNode} />
})

export default CanvasNode



const Content = memo(({ hyNode }: { hyNode: Workflow.Node.Hydrated }) => {

  const isNodeClicked = WorkbenchSDK.useStore(s => s.clickedNodeId === hyNode.id)
  const hasUpdate     = WorkbenchSDK.useDocument(d => d.selectors.dependency.doesNodeHaveUpdate(d, hyNode.id))

  const isMinimized = hyNode.ui.isMinimized;
  const isDisabled  = hyNode.isDisabled
  const isIgniter   = hyNode.blueprint.igniter ?? false
  const isPassive   = hyNode.blueprint.passive ?? false

  // Igniters and passive nodes never take inputs, so they get no offer to add one.
  const showAddInputPortBtn = !isIgniter && !isPassive && hyNode.outputs.length == 0 && hyNode.inputs.length == 0

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

      {isIgniter && 
        <div className='absolute top-1 -left-8'>
          <Tipped label={
            <div className='max-w-[220px]'>
              <p className='font-semibold'>Igniter Node</p>
              <p className='text-xs opacity-70'>A run can start from this node. Pick it as the entry point when you launch.</p>
            </div>
          }>
            <SystemIcons.Zap className='size-6 dark:text-yellow-300 text-yellow-400'/>
          </Tipped>
        </div>
      }
      {isPassive && 
        <div className='absolute top-1 -left-8'>
          <Tipped label={
            <div className='max-w-[220px]'>
              <p className='font-semibold'>Passive Node</p>
              <p className='text-xs opacity-70'>Never starts a run and cannot be launched. It only fires when another node reaches it mid-run.</p>
            </div>
          }>
            <SystemIcons.Ambient className='size-6 dark:text-cyan-300 text-cyan-400'/>
          </Tipped>
        </div>
      }

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
            <NodeInputs nodeId={hyNode.id} inputs={hyNode.inputs} isFlipped={hyNode.ui.isFlipped} showAddInputPortBtn={showAddInputPortBtn} />
            <NodeOutputs nodeId={hyNode.id} outputs={hyNode.outputs} isFlipped={hyNode.ui.isFlipped} />
          </div>
        }

        <StatusBorder status={executionStatus?.status} backgroundColor={backgroundColor} isClicked={isNodeClicked} />

      </div>
    </>
  )
})
