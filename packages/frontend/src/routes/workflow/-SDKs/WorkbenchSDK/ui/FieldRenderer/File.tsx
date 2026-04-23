import { memo } from 'react'
import { Input } from "@pretzel-graph/vx-ui/foundations/input"
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'

export const FileField = memo<RendererProps<'File'>>(({ field, nodeId, className }) => {
    const [value, issue, isReconciling] = WorkbenchSDK.useField(nodeId, field.id);

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            <div className="flex items-center gap-2">
                <Input
                    value={value as string}
                    readOnly
                    className={`opacity-50 ${issue ? "border-2 border-destructive animate-border-ping" : ""}`}
                    onChange={(e) => {
                        const val = e.currentTarget.value;
                        WorkbenchSDK.actions.field.setValue(nodeId, field, val)
                    }}
                />
            </div>
        </div>
    )
})
FileField.displayName = "FileField"
