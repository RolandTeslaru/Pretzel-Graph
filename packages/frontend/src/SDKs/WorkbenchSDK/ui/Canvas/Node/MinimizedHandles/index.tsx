import { Foundations, Workflow } from '@vx-agent-editor/shared/types'
import React, { useMemo } from 'react'
import NodeHandle from '../Handle'

interface Props {
    node: Workflow.Node
    isWorkflowLocked: boolean
    children?: React.ReactNode
}

const MinimizedHandles: React.FC<Props> = ({ node, isWorkflowLocked, children }) => {

    const inputs = useMemo(() => {
        const result: Foundations.Input[] = [];
        // Only include non-advanced inputs with handles
        node.inputs.forEach(input => {
            if (input.advanced || input.handleVariants.length === 0)
                return;
            result.push(input)
            if (!input.runtimeSubInputsRegistry)
                return;
            Object.entries(input.runtimeSubInputsRegistry).forEach(([_, { id: runtimeInputId }]) => {
                const runtimeInput = node.inputs.find(i => i.id === runtimeInputId)
                if (runtimeInput) {
                    result.push(runtimeInput)
                }
            })
        })
        return result
    }, [node.inputs])

    const outputs = useMemo(() => {
        const result: Foundations.Output[] = [];
        node.outputs.forEach(output => {
            if (output.handleVariants.length === 0)
                return
            result.push(output)
        })
        return result
    }, [node.outputs])

    return (
        <div className='flex flex-row w-full'>
            <div className='flex flex-col h-auto my-auto gap-2'>
                {inputs.map(input =>
                    <div className='h-2 relative' key={input.id}>
                        <NodeHandle
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
                    <div className='h-2 relative' key={output.id}>
                        <NodeHandle
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