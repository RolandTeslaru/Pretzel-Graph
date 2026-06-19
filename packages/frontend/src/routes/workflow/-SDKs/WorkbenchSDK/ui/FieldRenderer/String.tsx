import { memo } from 'react'
import { Textarea } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { WithExpression } from './withExpression'

export const StringField = memo<RendererProps<'String'>>(({ field, nodeId, className }) => {
    const [value, onChange, flush, issue, isReconciling, isExpression] = WorkbenchSDK.useField<string>(nodeId, field)

    let innerClassName = ""
    if (issue)
        innerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    const expressionProps = {
        value: value as string,
        isExpression,
        onToggleExpression: (val: boolean) => WorkbenchSDK.actions.field.setIsExpression(nodeId, field.id, val),
        onChange,
        onCommit: flush,
        nodeId,
        displayName: field.displayName,
        reconcile: field.reconcile,
        className,
    }

    return (
        <WithExpression {...expressionProps}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            {!isExpression ?
                <Textarea
                    size="sm"
                    placeholder={field.placeholder}
                    value={value as string}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={flush}
                    className={innerClassName}
                />
            :
                <WithExpression.Input placeholder={field.placeholder} className={innerClassName} />
            }
        </WithExpression>
    )
})
StringField.displayName = "StringField"
