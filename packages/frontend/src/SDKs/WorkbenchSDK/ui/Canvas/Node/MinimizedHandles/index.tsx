import { Workflow } from '@vx-agent-editor/shared/types'
import React, { useMemo } from 'react'
import NodeHandle from '../Handle'

interface Props {
    node: Workflow.Node
    isWorkflowLocked: boolean
    children?: React.ReactNode
}

const MinimizedHandles: React.FC<Props> = ({ node, isWorkflowLocked, children }) => {

    const inputs = useMemo(() => {
        const inputs: Workflow.Node.Input[] = [];
        node.data.ui.normalInputsOrder.forEach(inputId => {
            const input = node.data.inputs[inputId]
            if (input.langChainDataTypes.length === 0)
                return;
            inputs.push(input)
            if (!input.runtimeSubInputsRegistry)
                return;
            Object.entries(input.runtimeSubInputsRegistry).forEach(([_, { id: runtimeInputId }]) => {
                const runtimeInput = node.data.inputs[runtimeInputId]
                inputs.push(runtimeInput)
            })
        })
        return inputs
    }, [node.data.inputs, node.data.ui.normalInputsOrder])

    const outputs = useMemo(() => {
        const outputs: Workflow.Node.Output[] = [];
        Object.entries(node.data.outputs).forEach(([_, output]) => {
            if (output.langChainDataTypes.length === 0)
                return
            outputs.push(output)
        })
        return outputs
    }, [node.data.outputs])

    return (
        <div className='flex flex-row w-full'>
            <div className='flex flex-col h-auto my-auto gap-2'>
                {inputs.map(input =>
                    <div className='h-2 relative '>
                        <NodeHandle
                            key={input.id}
                            type="target"
                            field={input}
                            nodeId={node.id}
                            isWorkflowLocked={isWorkflowLocked}
                        />
                    </div>
                )}
            </div>
            {children}
            <div className='flex flex-col h-auto my-auto gap-2 relative ml-auto'>
                {outputs.map(output =>
                    <div className='h-2 relative'>
                        <NodeHandle
                            key={output.id}
                            type="source"
                            field={output}
                            nodeId={node.id}
                            isWorkflowLocked={isWorkflowLocked}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default MinimizedHandles