import React, { memo, useMemo } from 'react'
import { WorkbenchSDK } from '../../../../sdk'
import { Workflow, Foundations } from '@vx-agent-editor/shared/types';
import { InputLabel, INPUT_FIELD_RENDERER_MAP } from '../../../InputRenderer'
import NodeHandle from '../Handle'

const InputComponent: React.FC<{
    input: Foundations.Input
    nodeId: Workflow.Node.Id
    isWorkflowLocked: boolean
}> = memo(({ input, nodeId, isWorkflowLocked }) => {
    // @ts-ignore
    const Renderer = INPUT_FIELD_RENDERER_MAP[input.variant] ?? INPUT_FIELD_RENDERER_MAP["other"] as React.ElementType;

    const hasEdge = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.doesInputhaveEdge(s, nodeId, input.id))
    const hasHandle = input.handleVariants.length > 0;

    const runtimeInputs = useMemo(() => {
        const registry = input.runtimeSubInputsRegistry;
        if (!registry)
            return []

        const node = WorkbenchSDK.state.workflow.data.nodes[nodeId];
        const gatheredInputs: Foundations.Input.String[] = []
        Object.entries(registry).forEach(([_, runtimeInputSchema]) => {
            const runtimeInput = node.inputs.find(i => i.id === (runtimeInputSchema as { id: Foundations.Input.Id }).id) as Foundations.Input.String | undefined;
            if (runtimeInput) {
                gatheredInputs.push(runtimeInput)
            }
        })
        return gatheredInputs
    }, [input.runtimeSubInputsRegistry, nodeId])

    if (!input)
        return;

    return (
        <>
            <div className="w-full relative px-3">
                {hasHandle &&
                    <NodeHandle
                        type="target"
                        isWorkflowLocked={isWorkflowLocked}
                        field={input}
                        nodeId={nodeId}
                    />
                }
                {hasEdge ?
                    <InputLabel input={input} showTypeBadges={false} />
                    :
                    <Renderer input={input} nodeId={nodeId} showTypeBadges={false} />
                }
            </div>
            {runtimeInputs.map(runtimeInput =>
                <InputComponent nodeId={nodeId} input={runtimeInput} isWorkflowLocked={isWorkflowLocked} />
            )}
        </>
    )
})

interface Props {
    node: Workflow.Node
    isWorkflowLocked: boolean
}

const NodeInputs: React.FC<Props> = memo(({ node, isWorkflowLocked }) => {
    // Filter to non-advanced inputs that have handles (for display on the canvas node)
    const displayInputs = node.inputs.filter(input =>
        !input.advanced && input.handleVariants.length > 0
    );

    return (
        <div className="flex flex-col relative py-1 gap-2">
            {displayInputs.map(input => (
                <InputComponent
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

