import { memo } from 'react'
import { Input } from "@pretzel-graph/vx-ui/foundations/input"
import { Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'

export const OtherField = memo(({ field, nodeId }: { field: Foundations.Field, nodeId: Workflow.Node.Id }) => {
    const [value, issue, isReconciling] = WorkbenchSDK.useField(nodeId, field.id);

    return (
        <>
            <FieldLabel field={field} isReconciling={isReconciling} />
            <Input
                value={String(value)}
                disabled
                className={issue ? "border-2 border-destructive animate-border-ping" : ""}
            />
            <div className="text-[10px] text-muted-foreground mt-1">Unknown variant: {field.variant}</div>
        </>
    )
})
OtherField.displayName = "OtherField"
