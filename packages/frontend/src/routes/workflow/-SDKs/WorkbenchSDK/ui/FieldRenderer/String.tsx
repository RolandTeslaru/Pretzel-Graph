import { memo, useState } from 'react'
import { Tabs, Textarea } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { ExpressionInput } from './ExpressionInput'

export const StringField = memo<RendererProps<'String'>>(({ field, nodeId, className }) => {
    const [value, issue, isReconciling] = WorkbenchSDK.useField(nodeId, field.id)

    const isExpression = field.isExpression ?? false;

    let innerClassName = ""
    if (issue)
        innerClassName = "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50"

    const [isHovered, setIsHovered] = useState(false)

    return (
        <div
            className={className + " w-full nodrag cursor-auto flex flex-col gap-1 relative"}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <FieldLabel field={field} isReconciling={isReconciling} />
            {!isExpression ?
                <Textarea
                    size="sm"
                    placeholder={field.placeholder}
                    value={value as string}
                    onChange={(e) => WorkbenchSDK.actions.field.setValue(nodeId, field, e.target.value)}
                    className={innerClassName}
                />
            :
                <div className='bg-input/50 border border-border rounded-md p-0.5'>
                    <ExpressionInput
                        value={value as string}
                        nodeId={nodeId}
                        onChange={(newValue) => WorkbenchSDK.actions.field.setValue(nodeId, field, newValue)}
                        onCommit={(newValue) => WorkbenchSDK.actions.field.setValue(nodeId, field, newValue)}
                        placeholder={field.placeholder}
                        className={innerClassName}
                    />
                </div>
            }
            {(isHovered || isExpression) && (
                <Tabs.Root
                    value={isExpression ? 'expression' : 'static'}
                    onValueChange={(value) => {
                        WorkbenchSDK.actions.field.setIsExpression(nodeId, field.id, value === 'expression')
                    }}
                    className='absolute -top-1 right-0'
                >
                    <Tabs.List variant="accent" size="xxs">
                        <Tabs.Trigger value='expression'>Expression</Tabs.Trigger>
                        <Tabs.Trigger value='static'>Static</Tabs.Trigger>
                    </Tabs.List>
                </Tabs.Root>
            )}
        </div>
    )
})
StringField.displayName = "StringField"
