import { memo } from 'react'
import { Input } from "@pretzel-graph/standard-ui/foundations/input"
import { Slider } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { WithExpression } from './withExpression'

export const IntegerField = memo<RendererProps<'Integer'>>(({ field, nodeId, className }) => {
    const [value, onChange, flush, issue, isReconciling, isExpression] = WorkbenchSDK.useField(nodeId, field);
    const hasSlider = field.slider;

    let errorClass = ""
    if (issue)
        errorClass = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    const expressionProps = {
        value: String(value ?? ""),
        isExpression,
        onToggleExpression: (val: boolean) => WorkbenchSDK.actions.field.setIsExpression(nodeId, field.id, val),
        onChange: (val: string) => onChange(val as any),
        onCommit: flush,
        nodeId,
        displayName: field.displayName,
        reconcile: field.reconcile,
        className,
    }

    return (
        <WithExpression {...expressionProps}>
            {isExpression ?
                <>
                    <FieldLabel field={field} isReconciling={isReconciling} />
                    <WithExpression.Input className={errorClass} />
                </>
            : hasSlider ?
                <>
                    <FieldLabel field={field} isReconciling={isReconciling} />
                    <div className='flex flex-row gap-2'>
                        <Slider
                            className={`my-auto ${issue ? "opacity-50" : ""}`}
                            min={field.min}
                            max={field.max}
                            step={field.step ?? 1}
                            value={[Number(value) || 0]}
                            onValueChange={val => { onChange(val[0]); flush() }}
                        />
                        <Input
                            type="number"
                            size="xs"
                            className={`ml-auto w-20 ${errorClass}`}
                            value={value as string}
                            step={field.step ?? 1}
                            min={field.min}
                            max={field.max}
                            onChange={(e) => onChange(Number(e.currentTarget.value))}
                            onBlur={flush}
                        />
                    </div>
                </>
                :
                <>
                    <FieldLabel field={field} isReconciling={isReconciling} />
                    <Input
                        type="number"
                        size="sm"
                        className={errorClass}
                        step={field.step ?? 1}
                        min={field.min}
                        max={field.max}
                        value={value as string}
                        onChange={(e) => onChange(Number(e.currentTarget.value))}
                        onBlur={flush} />
                </>
            }
        </WithExpression>
    )
})
IntegerField.displayName = "IntegerField"
