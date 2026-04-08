import { memo } from 'react'
import { Textarea } from '@vx-agent-editor/vx-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'

export const StringField = memo<RendererProps<'String'>>(({ field, nodeId, className }) => {
    const [value, issue, isReconciling] = WorkbenchSDK.useField(nodeId, field.id)

    let innerClassName = ""
    if (issue)
        innerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            <Textarea
                size="sm"
                placeholder={field.placeholder}
                value={value as string}
                onChange={(e) => WorkbenchSDK.actions.field.setValue(nodeId, field, e.target.value)}
                className={innerClassName}
            />
        </div>
    )
})
StringField.displayName = "StringField"
