import { Workflow } from '@pretzel-graph/shared/domain'
import React from 'react'
import { Port } from '../../Port'
import { WorkbenchSDK } from '../../../../../sdk'

interface Props {
    nodeId: Workflow.Node.Id,
    isWorkflowLocked: boolean
    isFlipped?: boolean
    children?: React.ReactNode
}

const MinimizedHandles: React.FC<Props> = ({ nodeId, isWorkflowLocked, isFlipped, children }) => {

    const inputs = WorkbenchSDK.useInputs(nodeId)
    const outputs = WorkbenchSDK.useOutputs(nodeId)

    return (
        <div className={`flex w-full py-2 ${isFlipped ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className='flex flex-col h-auto my-auto gap-4'>
                {inputs.map(input =>
                    <div className='h-2 relative' key={input.id}>
                        <Port
                            type="target"
                            port={input}
                            nodeId={nodeId}
                            isWorkflowLocked={isWorkflowLocked}
                            isFlipped={isFlipped}
                        />
                    </div>
                )}
            </div>
            {children}
            <div className={`flex flex-col h-auto my-auto gap-4 relative ${isFlipped ? 'mr-auto' : 'ml-auto'}`}>
                {outputs.map(output =>
                    <div className='h-2 relative' key={output.id}>
                        <Port
                            type="source"
                            port={output}
                            nodeId={nodeId}
                            isWorkflowLocked={isWorkflowLocked}
                            isFlipped={isFlipped}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default MinimizedHandles