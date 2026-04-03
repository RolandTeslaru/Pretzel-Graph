import { memo } from 'react'
import { Input } from "@vx-agent-editor/vx-ui/foundations/input"
import { Slider } from '@vx-agent-editor/vx-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'

export const IntegerField = memo<RendererProps<'Integer'>>(({ field, nodeId, className }) => {
    const [value, issue, isReconciling] = WorkbenchSDK.useField(nodeId, field.id);
    const hasSlider = field.slider;

    let errorClass = ""
    if (issue)
        errorClass = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            {hasSlider ?
                <>
                    <FieldLabel field={field} isReconciling={isReconciling} />
                    <div className='flex flex-row gap-2'>
                        <Slider
                            className={`pt-1 ${issue ? "opacity-50" : ""}`}
                            min={field.min}
                            max={field.max}
                            step={field.step ?? 1}
                            value={[Number(value) || 0]}
                            variant="accent"
                            onValueChange={val => {
                                WorkbenchSDK.actions.field.setValue(nodeId, field, val[0])
                            }}
                        />
                        <Input
                            type="number"
                            className={`ml-auto w-20 h-6 ${errorClass}`}
                            value={value as string}
                            step={field.step ?? 1}
                            min={field.min}
                            max={field.max}
                            onChange={(e) => {
                                const val = e.currentTarget.value;
                                WorkbenchSDK.actions.field.setValue(nodeId, field, Number(val))
                            }}
                        />
                    </div>
                </>
                :
                <>
                    <FieldLabel field={field} isReconciling={isReconciling} />
                    <Input
                        type="number"
                        className={errorClass}
                        step={field.step ?? 1}
                        min={field.min}
                        max={field.max}
                        value={value as string}
                        onChange={(e) => {
                            const val = e.currentTarget.value;
                            WorkbenchSDK.actions.field.setValue(nodeId, field, Number(val))
                        }} />
                </>
            }
        </div>
    )
})
IntegerField.displayName = "IntegerField"
