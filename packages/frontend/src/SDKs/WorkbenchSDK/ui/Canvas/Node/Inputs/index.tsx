import React, { memo, useMemo } from 'react'
import { WorkbenchSDK } from '../../../../sdk'
import { Workflow } from '@vx-agent-builder/shared/types';
import { InputLabel, INPUT_FIELD_RENDERER_MAP } from '../../../InputRenderer'
import NodeHandle from '../Handle'

const InputComponent: React.FC<{
    input: Workflow.Node.Input
    nodeId: Workflow.Node.Id
    isWorkflowLocked: boolean
}> = memo(({ input, nodeId, isWorkflowLocked }) => {
    const Renderer = INPUT_FIELD_RENDERER_MAP[input.variant] ?? INPUT_FIELD_RENDERER_MAP["other"] as React.ElementType;

    const hasEdge = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.doesInputhaveEdge(s, nodeId, input.id))
    const hasHandle = input.langChainDataTypes.length > 0;

    const runtimeInputs = useMemo(() => {
        const registry = input.runtimeSubInputsRegistry;
        if (!registry)
            return []

        const gatheredInputs: Workflow.Node.Input.String[] = []
        Object.entries(registry).forEach(([_, runtimeInputSchema]) => {
            const runtimeInput = WorkbenchSDK.state.workflow.data.nodes[nodeId].data.inputs[runtimeInputSchema.id] as Workflow.Node.Input.String;
            gatheredInputs.push(
                runtimeInput
            )
        })
        return gatheredInputs
    }, [input.runtimeSubInputsRegistry])

    if(!input)
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
    return (
        <div className="flex flex-col relative py-1 gap-2">
            {node.data.ui.normalInputsOrder
                .map((inputId) => {
                    const input = node.data.inputs[inputId]
                    if (!input || input.langChainDataTypes.length === 0) return null;
                    return (
                        <InputComponent
                            key={input.id}
                            input={input}
                            nodeId={node.id}
                            isWorkflowLocked={isWorkflowLocked}
                        />
                    )
                }
                )}
        </div>
    )
})

export default NodeInputs

