import { memo } from 'react'
import { Input } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'

export const DependencySelectorField = memo<RendererProps<'DependencySelector'>>(({ field, nodeId, className }) => {
    const [value, issue, isReconciling] = WorkbenchSDK.useField(nodeId, field.id)

    let innerClassName = ""
    if (issue)
        innerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            <Input
                size="sm"
                placeholder={field.placeholder}
                value={(value as string | undefined) ?? ""}
                onChange={(e) => WorkbenchSDK.actions.field.setValue(nodeId, field, e.target.value)}
                className={innerClassName}
            />
        </div>
    )
})
DependencySelectorField.displayName = "DependencySelectorField"
