import React, { memo, useMemo } from 'react'
import { WorkbenchSDK } from '../../../../sdk'
import { Workflow, Foundations } from '@pretzel-graph/shared/domain';
import { Port } from '../Port'
import { INPUT_RENDERER_MAP } from '../../../InputsRenderer';
import { InputLabel, type InputLabelSize, type InputLabelVariant } from '../../../InputsRenderer/label';
import { Button } from '@pretzel-graph/standard-ui/foundations';

const Item: React.FC<{
    input: Foundations.Port.Input
    nodeId: Workflow.Node.Id
    isFlipped?: boolean
}> = memo(({ input, nodeId, isFlipped }) => {
    const hasEdge = WorkbenchSDK.useDocument(d => d.selectors.input.hasEdge(d, nodeId, input.id))

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
    showAddInputPortBtn?: boolean
}

// A node with no inputs offers to add one in place.
const AddInputPort: React.FC<{ nodeId: Workflow.Node.Id }> = memo(({ nodeId }) => {
    return (
        <div className="w-full px-2">
            <Button
                variant="ghost"
                size="sm"
                className="nodrag rounded-full! w-full justify-start text-muted-foreground"
                disabled={WorkbenchSDK.isLocked}
                onClick={() => WorkbenchSDK.dialogs.openAddInputPort(nodeId)}
            >
                + Add input port
            </Button>
        </div>
    )
})

const NodeInputs: React.FC<Props> = memo(({ nodeId, inputs, isFlipped, showAddInputPortBtn = false }) => {

    return (
        <div className="flex flex-col relative gap-2">
            {showAddInputPortBtn && inputs.length === 0 && <AddInputPort nodeId={nodeId} />}
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
