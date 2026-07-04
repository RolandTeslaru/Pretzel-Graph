import React, { memo, useMemo } from 'react'
import { WorkbenchSDK } from '../../../../sdk'
import { Workflow, Foundations } from '@pretzel-graph/shared/domain';
import { Port } from '../Port'
import { INPUT_RENDERER_MAP } from '../../../InputRenderer';
import { InputLabel, type InputLabelSize, type InputLabelVariant } from '../../../InputRenderer/label';

const Item: React.FC<{
    input: Foundations.Port.Input
    nodeId: Workflow.Node.Id
    isFlipped?: boolean
}> = memo(({ input, nodeId, isFlipped }) => {
    const hasEdge = WorkbenchSDK.useStore(s => s.selectors.input.hasEdge(s, nodeId, input.id))

    if (!input)
        return;

    const Component = INPUT_RENDERER_MAP[input.variant] as React.ComponentType<{
        input: Foundations.Port.Input
        nodeId: Workflow.Node.Id
        labelVariant?: InputLabelVariant
        labelSize?: InputLabelSize
        className?: string
        isFlipped?: boolean
    }> | undefined

    return (
        <div className="w-full relative px-3 py-0.5">
            <Port
                type="target"
                port={input}
                nodeId={nodeId}
                isFlipped={isFlipped}
            />
            {(Component && hasEdge === false) ? (
                <Component labelVariant="inline" labelSize="md" input={input} nodeId={nodeId} isFlipped={isFlipped} />
            ) : (
                <div className={" w-full flex flex-col relative gap-1 "}>
                    <InputLabel input={input} isFlipped={isFlipped} variant="inline" size="md" />
                </div>
            )}
        </div>
    )
})

interface Props {
    nodeId: Workflow.Node.Id
    inputs: Foundations.Port.Input[]
    isFlipped?: boolean
}

const NodeInputs: React.FC<Props> = memo(({ nodeId, inputs, isFlipped }) => {

    return (
        <div className="flex flex-col relative gap-2">
            {inputs.map(input => (
                <Item
                    key={input.id}
                    input={input}
                    nodeId={nodeId}
                    isFlipped={isFlipped}
                />
            ))}
        </div>
    )
})

export default NodeInputs
