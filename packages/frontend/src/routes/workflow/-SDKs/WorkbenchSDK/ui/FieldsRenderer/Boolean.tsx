import { memo } from 'react'
import { Switch } from '@pretzel-graph/standard-ui/foundations/switch'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { WithExpression } from './withExpression'

// Legacy IfElse condition values were a rule-tree object — coerce anything that
// isn't a boolean/string to the safe default so the input never shows "[object Object]".
const normalize = (value: unknown): boolean | string =>
    typeof value === 'boolean' || typeof value === 'string' ? value : true

export const BooleanField = memo<RendererProps<'Boolean'>>(({ field, nodeId, className }) => {
    const [rawValue, onChange, flush, issue, isReconciling, isExpression] = WorkbenchSDK.useField<boolean | string>(nodeId, field)
    const value = normalize(rawValue)

    const expressionProps = {
        value: typeof value === 'string' ? value : String(value),
        isExpression,
        onToggleExpression: (val: boolean) => WorkbenchSDK.actions.field.setIsExpression(nodeId, field.id, val),
        onChange,
        onCommit: flush,
        nodeId,
        displayName: field.displayName,
        reconcile: field.reconcile,
        itemScoped: field.itemScoped,
        className,
    }

    let innerClassName = ""
    if (issue)
        innerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    return (
        <WithExpression {...expressionProps} tabClassName='-top-3.5'>
            {!isExpression ? (
                <div className="flex items-center justify-between py-2 nodrag cursor-auto">
                    <FieldLabel field={field} isReconciling={isReconciling} />
                    <Switch
                        checked={value === true || value === 'true'}
                        size={"lg"}
                        onCheckedChange={(checked) => {
                            WorkbenchSDK.actions.field.setValue(nodeId, field, checked)
                        }}
                    />
                </div>
            ) : (
                <>
                    <FieldLabel field={field} isReconciling={isReconciling} />
                    <WithExpression.Input className={innerClassName} />
                </>
            )}
        </WithExpression>
    )
})
BooleanField.displayName = "BooleanField"
