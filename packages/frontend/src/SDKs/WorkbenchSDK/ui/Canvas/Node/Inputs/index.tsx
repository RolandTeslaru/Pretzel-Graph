import React, { memo, useMemo } from 'react'
import { WorkbenchSDK } from '../../../../sdk'
import { Workflow, Foundations } from '@vx-agent-editor/shared/domain';
import { Port } from '../Port'
import { InputRenderer } from '../../../InputRenderer';

const InputPort: React.FC<{
    input: Foundations.Port.Input
    nodeId: Workflow.Node.Id
    isWorkflowLocked: boolean
    isFlipped?: boolean
}> = memo(({ input, nodeId, isWorkflowLocked, isFlipped }) => {
    const hasEdge = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.doesInputhaveEdge(s, nodeId, input.id))

    if (!input)
        return;

    return (
        <div className="w-full relative px-3 py-0.5">
            <Port
                type="target"
                isWorkflowLocked={isWorkflowLocked}
                port={input}
                nodeId={nodeId}
                isFlipped={isFlipped}
            />
            <InputRenderer input={input} nodeId={nodeId} hideInnerComponent={hasEdge} showTypeBadge={false} isFlipped={isFlipped} />
        </div>
    )
})

interface Props {
    node: Workflow.Node
    isWorkflowLocked: boolean
    isFlipped?: boolean
}

const NodeInputs: React.FC<Props> = memo(({ node, isWorkflowLocked, isFlipped }) => {

    const inputs = useMemo(() => node.inputs.filter(i => !i.internal), [node.inputs])

    if(inputs.length === 0)
        return null

    return (
        <div className="flex flex-col relative gap-2">
            {inputs.map(input => (
                <InputPort
                    key={input.id}
                    input={input}
                    nodeId={node.id}
                    isWorkflowLocked={isWorkflowLocked}
                    isFlipped={isFlipped}
                />
            ))}
        </div>
    )
})

export default NodeInputs

