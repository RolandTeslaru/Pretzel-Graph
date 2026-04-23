import { memo } from 'react'
import { Switch } from '@pretzel-graph/vx-ui/foundations/switch'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'

export const BooleanField = memo<RendererProps<'Boolean'>>(({ field, nodeId, className }) => {
    const [value, , isReconciling] = WorkbenchSDK.useField(nodeId, field.id)

    return (
        <div className={className + " flex items-center justify-between py-2 nodrag cursor-auto"}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            <Switch
                checked={!!value}
                size={"lg"}
                onCheckedChange={(checked) => {
                    WorkbenchSDK.actions.field.setValue(nodeId, field, checked)
                }}
            />
        </div>
    )
})
BooleanField.displayName = "BooleanField"
