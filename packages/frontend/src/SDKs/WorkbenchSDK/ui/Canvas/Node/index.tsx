import { memo, useRef } from 'react'
import { WorkbenchSDK } from '../../../sdk';
import { NodeHeader } from './Header';
import NodeInputs from './Inputs';
import NodeOutputs from './Outputs';

import type { NodeProps } from '@xyflow/react';
import { Workflow } from '@vx-agent-editor/shared/domain';
import { NodeToolbar, Position } from '@xyflow/react';
import { NodeCustomToolbar } from './CustomToolbar';
import { cn } from '@/utils/styleUtils';

const WorkbenchNode = memo((props: NodeProps<WorkbenchSDK.NodeDriver>) => {
  const node = WorkbenchSDK.useStore(s => s.workflow.data.nodes[props.id as Workflow.Node.Id])

  if (!node)
    return null;

  return <WorkbenchNodeContent node={node} />
})

export default WorkbenchNode


const WorkbenchNodeContent = memo(({ node }: { node: Workflow.Node }) => {

  const [isNodeClicked, isWorkflowLocked, isMinimized] = WorkbenchSDK.useStore(
    s => [
      s.clickedNodeId === node.id,
      s.workflow.locked,
      s.workflow.data.nodes[node.id].isMinimized
    ]
  );

  return (
    <>
      <NodeToolbar isVisible={isNodeClicked} position={Position.Top}>
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-200 ease-out origin-bottom">
          <NodeCustomToolbar node={node} />
        </div>
      </NodeToolbar>

      <div className={cn(
        "animate-in fade-in-0 duration-200 ease-out p-1 border-2 transition-colors",
        "flex flex-col relative rounded-3xl shadow-lg shadow-black/20 dark:shadow-black/30",
        isNodeClicked ? "ring-4 ring-primary/20 ring-offset-8 ring-offset-background" : "",
        isMinimized ? "min-w-[100px]" : "w-[250px]",
      )}
        style={{
          backgroundColor:
            node.accent
              ? `color-mix(in srgb, ${node.accent} 22%, var(--card))`
              : 'var(--secondary)',
          borderColor:
            node.accent
              ? `color-mix(in srgb, ${node.accent} 22%, var(--border))`
              : 'var(--border)'
        }}
      >
        <NodeHeader node={node} isWorkflowLocked={isWorkflowLocked} />
        {isMinimized === false &&
          <div className='pt-1 bg-card/80 border border-border/50 rounded-b-[22px] rounded-t-lg shadow-sm shadow-black/10'>
            <NodeInputs node={node} isWorkflowLocked={isWorkflowLocked} />
            <NodeOutputs node={node} isWorkflowLocked={isWorkflowLocked} />
          </div>
        }
      </div>
    </>
  )
})