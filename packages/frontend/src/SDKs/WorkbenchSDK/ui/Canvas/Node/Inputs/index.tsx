import React, { memo, useMemo } from 'react'
import { WorkbenchSDK } from '../../../../sdk'
import { Workflow, Foundations } from '@vx-agent-editor/shared/types';
import NodeHandle from '../Handle'
import { InputRenderer } from '../../../InputRenderer';

const InputPort: React.FC<{
    input: Foundations.Port.Input
    nodeId: Workflow.Node.Id
    isWorkflowLocked: boolean
}> = memo(({ input, nodeId, isWorkflowLocked }) => {
    const hasEdge = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.doesInputhaveEdge(s, nodeId, input.id))

    if (!input)
        return;

    return (
        <div className="w-full relative px-3">
            <NodeHandle
                type="target"
                isWorkflowLocked={isWorkflowLocked}
                port={input}
                nodeId={nodeId}
            />
            <InputRenderer input={input} nodeId={nodeId} hideInnerComponent={hasEdge} showTypeBadge={false}/>
        </div>
    )
})

interface Props {
    node: Workflow.Node
    isWorkflowLocked: boolean
}

const NodeInputs: React.FC<Props> = memo(({ node, isWorkflowLocked }) => {

    return (
        <div className="flex flex-col relative py-1 gap-2">
            {node.inputs.map(input => (
                <InputPort
                    key={input.id}
                    input={input}
                    nodeId={node.id}
                    isWorkflowLocked={isWorkflowLocked}
                />
            ))}
        </div>
    )
})

export default NodeInputs

