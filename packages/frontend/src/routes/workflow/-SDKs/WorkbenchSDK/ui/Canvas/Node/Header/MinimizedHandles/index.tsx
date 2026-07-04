import { Foundations, Workflow } from '@pretzel-graph/shared/domain'
import React from 'react'
import { WorkbenchSDK } from '../../../../../sdk'
import { Port } from '../../Port'

interface Props {
    nodeId: Workflow.Node.Id,
    inputs: Foundations.Port.Input[],
    outputs: Foundations.Port.Output[],
    isFlipped?: boolean
    children?: React.ReactNode
}

const MinimizedHandles: React.FC<Props> = ({ nodeId, inputs, outputs, isFlipped, children }) => {

    return (
        <div className={`flex w-full py-2 ${isFlipped ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className='flex flex-col h-auto my-auto gap-4'>
                {inputs.map(input =>
                    <div className='h-2 relative' key={input.id}>
                        <Port
                            type="target"
                            port={input}
                            nodeId={nodeId}
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
                            isFlipped={isFlipped}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default MinimizedHandles