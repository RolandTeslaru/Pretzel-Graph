import React, { memo } from 'react'
import { FieldLabel, type RendererProps } from './FieldLabel'
import { WorkbenchSDK } from '../../sdk'
import { ButtonGroup } from '@pretzel-graph/standard-ui/foundations/button-group'
import { Button, Input } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

// The slot count. Writing it re-derives the node, which is what adds or removes the ports.
export const VariadicField = memo<RendererProps<'Variadic'>>(({ field, nodeId, className }) => {
    const [draft, onChange, flush] = WorkbenchSDK.useField<number>(nodeId, field)

    const min   = field.min ?? 0
    const max   = field.max ?? Infinity
    const value = typeof draft === 'number' && Number.isFinite(draft) ? draft : field.initialValue
    const clamp = (next: number) => Math.min(max, Math.max(min, Math.trunc(next)))

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-row justify-between gap-1"}>
            <FieldLabel field={field} />
            <ButtonGroup>
                <Input
                    type="number"
                    value={value}
                    min={min}
                    max={field.max}
                    onChange={(e) => onChange(clamp(Number(e.target.value)))}
                    onBlur={flush}
                    size='xs'
                    className='w-13'
                />
                <Button
                    variant="outline"
                    size="icon-xs"
                    type="button"
                    aria-label="Decrement"
                    disabled={value <= min}
                    onClick={() => WorkbenchSDK.actions.field.setValue(nodeId, field, clamp(value - 1))}
                >
                    <SystemIcons.Minus />
                </Button>
                <Button
                    variant="outline"
                    size="icon-xs"
                    type="button"
                    aria-label="Increment"
                    disabled={value >= max}
                    onClick={() => WorkbenchSDK.actions.field.setValue(nodeId, field, clamp(value + 1))}
                >
                    <SystemIcons.Plus />
                </Button>
            </ButtonGroup>
        </div>
    )
})

export default VariadicField
