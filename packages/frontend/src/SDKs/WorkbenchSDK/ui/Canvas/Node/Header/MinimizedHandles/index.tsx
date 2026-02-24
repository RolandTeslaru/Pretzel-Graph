import { Workflow } from '@vx-agent-editor/shared/domain'
import React, { useMemo } from 'react'
import NodeHandle from '../../Handle'

interface Props {
    node: Workflow.Node
    isWorkflowLocked: boolean
    children?: React.ReactNode
}

const MinimizedHandles: React.FC<Props> = ({ node, isWorkflowLocked, children }) => {

    const inputs = useMemo(() => node.inputs.filter(i => !i.internal), [node.inputs])

    return (
        <div className='flex flex-row w-full'>
            <div className='flex flex-col h-auto my-auto gap-4'>
                {inputs.map(input =>
                    <div className='h-2 relative' key={input.id}>
                        <NodeHandle
                            type="target"
                            port={input}
                            nodeId={node.id}
                            isWorkflowLocked={isWorkflowLocked}
                        />
                    </div>
                )}
            </div>
            {children}
            <div className='flex flex-col h-auto my-auto gap-4 relative ml-auto'>
                {node.outputs.map(output =>
                    <div className='h-2 relative' key={output.id}>
                        <NodeHandle
                            type="source"
                            port={output}
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