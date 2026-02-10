import React, { memo } from 'react'
import { WorkbenchSDK } from '../../../sdk';
import { NodeHeader } from './Header';
import NodeInputs from './Inputs';
import NodeOutputs from './Outputs';

import type { NodeProps } from '@xyflow/react';
import { Workflow } from '@vx-agent-editor/shared/types';
import { motion } from 'motion/react';

const WorkbenchNode = memo((props: NodeProps<WorkbenchSDK.NodeDriver>) => {
  const node = WorkbenchSDK.useStore(s => s.workflow.data.nodes[props.id as Workflow.Node.Id])

  if (!node)
    return null;

  return <WorkbenchNodeContent node={node} />
}, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id
})

export default WorkbenchNode


const WorkbenchNodeContent = memo(({ node }: { node: Workflow.Node }) => {
  const isNodeClicked = WorkbenchSDK.useStore(s => s.clickedNodeId === node.id);
  const isWorkflowLocked = WorkbenchSDK.useStore(s => s.workflow.locked);

  const isMinimized = node.isMinimized;

  return (
    <motion.div className={` ${isMinimized ? "min-w-[100px]" : "w-[250px]"}
       flex flex-col bg-card relative rounded-3xl border
      ${isNodeClicked ? "border-primary" : "border-foreground/15 shadow-xl shadow-black/40"}
      `}
      initial={{
        scale: 0,
      }}
      animate={{
        scale: 1
      }}
      >
      <NodeHeader node={node} isWorkflowLocked={isWorkflowLocked}/>
      {isMinimized === false &&
        <>
          <NodeInputs node={node} isWorkflowLocked={isWorkflowLocked} />
          <NodeOutputs node={node} isWorkflowLocked={isWorkflowLocked} />
        </>
      }
    </motion.div>
  )
}, (prev, next) => {
  return prev.node.id === next.node.id
})