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
    backgroundColor = `color-mix(in srgb, var(--${node.accent}) 22%, var(--card))`;
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
        "animate-in fade-in-0 duration-200 ease-out p-1 border-2 transition-colors",
        "flex flex-col relative rounded-3xl shadow-lg shadow-black/20 dark:shadow-black/30",
        node.isMinimized ? "min-w-[100px]" : "w-[250px]",
      )}
        style={{ backgroundColor, borderColor }}
      >
        <NodeHeader executionStatus={nodeStatus} node={node} isWorkflowLocked={isWorkflowLocked} />

        {node.isMinimized === false &&
          <div className='pt-1 bg-card/80 border border-border/50 rounded-b-[22px] rounded-t-lg shadow-sm shadow-black/10'>
            <NodeInputs node={node} isWorkflowLocked={isWorkflowLocked} isFlipped={node.isFlipped} />
            <NodeOutputs node={node} isWorkflowLocked={isWorkflowLocked} isFlipped={node.isFlipped} />
          </div>
        }

{/* Status Border */}
        {nodeStatus?.status && nodeStatus.status !== "idle" && nodeStatus.status !== "failed" && (
          <div
            className={cn(
              'absolute z-[-1] rounded-4xl pointer-events-none overflow-hidden',
              nodeStatus.status === "waiting" && "animate-pulse",
            )}
            style={{ inset: -7 }}
          >
            {/* Gradient fill / spinning beam */}
            <div
              className="absolute inset-0"
              style={nodeStatus.status === "running" ? {
                background: "conic-gradient(from 0deg, transparent 60%, var(--status-active) 80%, var(--status-active) 90%, transparent 100%)",
                animation: "spin 1.5s linear infinite",
                inset: "-40%",
              } : {
                background: nodeStatus.status === "completed"
                  ? "var(--status-success)"
                  : nodeStatus.status === "waiting"
                    ? "var(--status-waiting)"
                    : "transparent",
                opacity: 0.6,
              }}
            />
            {/* Inner mask to hollow out the center */}
   
          </div>
        )}

        {/* Failed ping border */}
        {nodeStatus?.status === "failed" && (
          <>
            <div
              className="absolute z-[-1] rounded-4xl pointer-events-none"
              style={{ inset: -7, background: "var(--destructive)", opacity: 0.6 }}
            />
            <div
              className="absolute z-[-1] rounded-4xl pointer-events-none animate-ping-fixed-10"
              style={{ inset: -7, background: "var(--destructive)", opacity: 0.6 }}
            />
            <div
              className="absolute z-[-1] rounded-[calc(2rem-3px)] pointer-events-none"
              style={{  background: backgroundColor }}
            />
          </>
        )}

      </div>
    </>
  )
})