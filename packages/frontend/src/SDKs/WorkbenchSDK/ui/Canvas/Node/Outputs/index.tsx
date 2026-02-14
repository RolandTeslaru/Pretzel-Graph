import React, { useMemo } from 'react'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import NodeHandle from '../Handle'

interface NodeOutputProps {
  node: Workflow.Node
  isWorkflowLocked: boolean
  output: Foundations.Port.Output
}

const NodeOutput: React.FC<NodeOutputProps> = ({ node, isWorkflowLocked, output }) => {
  return (
    <div className="relative w-full flex justify-end items-center h-8 pr-1">
      <div className="mr-4 text-sm font-medium text-foreground">
        {output.displayName ?? output.id}
      </div>
      <NodeHandle
        type="source"
        isWorkflowLocked={isWorkflowLocked}
        port={output}
        nodeId={node.id}
      />
    </div>
  )
}


interface Props {
  node: Workflow.Node
  isWorkflowLocked: boolean
}

const NodeOutputs: React.FC<Props> = ({ node, isWorkflowLocked }) => {
  const outputs = useMemo(() => {
    return Object.values(node.outputs) as Foundations.Port.Output[]
  }, [node.outputs])

  const selectedOutput = outputs[0]

  return (
    <div className="relative flex flex-col gap-1 py-1">
      {outputs.map((output) => (
        <NodeOutput
          key={output.id}
          node={node}
          isWorkflowLocked={isWorkflowLocked}
          output={output}
        />
      ))}
      {/* <Select.Root>
        <Select.Trigger className='w-2/3 ml-auto mr-4 text-sm bg-white/0! border-none!'/>
        <Select.Content>
          {Object.values(node.outputs as Record<Workflow.Node.Output.Id, Workflow.Node.Output>).map((output) => (
            <Select.Item
              key={output.id}
              value={output.id}
              className='text-sm py-1'
            >
              {output.uiData.displayName ?? output.id}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <NodeHandle
        type="source"
        isWorkflowLocked={isWorkflowLocked}
        field={selectedOutput}
        nodeId={node.id}
      /> */}
    </div>
  )
}

export default NodeOutputs
