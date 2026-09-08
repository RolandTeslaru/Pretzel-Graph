import React, { memo } from 'react'
import { FieldLabel, type RendererProps } from './FieldLabel'
import { WorkbenchSDK } from '../../sdk'
import { ButtonGroup } from '@pretzel-graph/standard-ui/foundations/button-group'
import { Button, Input } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

export const VariadicField = memo<RendererProps<'Variadic'>>(({ field, nodeId, className }) => {
    const value = WorkbenchSDK.useDocument(d => {
        if(!d.data.nodes[nodeId] || field.groupId === undefined)
            return 0
        return d.selectors.node.getInputs(d, nodeId).filter(i => i.groupId === field.groupId).length
    })

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-row justify-between gap-1"}>
            <FieldLabel field={field} />
            <ButtonGroup>
                <Input
                    id="number-of-gpus-f6l"
                    value={value}
                    size='xs'
                    className='w-13'
                />
                <Button
                    variant="outline"
                    size="icon-xs"
                    type="button"
                    aria-label="Decrement"
                    onClick={() => {
                        WorkbenchSDK.actions.field.variadic.remove(nodeId, field.id)
                    }}
                >
                    <SystemIcons.Minus
                    />
                </Button>
                <Button
                    variant="outline"
                    size="icon-xs"
                    type="button"
                    aria-label="Increment"
                    onClick={() => {
                        WorkbenchSDK.actions.field.variadic.add(nodeId, field.id)
                    }}
                >
                    <SystemIcons.Plus
                    />
                </Button>
            </ButtonGroup>
        </div>
    )
})

export default VariadicField
