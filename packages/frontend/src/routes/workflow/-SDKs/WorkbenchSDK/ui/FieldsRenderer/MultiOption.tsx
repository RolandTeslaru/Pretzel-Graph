import { memo } from 'react'
import { Select } from "@pretzel-graph/standard-ui/foundations/select"
import { Tabs } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { WithExpression } from './withExpression'

export const MultiOptionField = memo<RendererProps<'MultiOption'>>(({ field, nodeId, className }) => {
    const [value, onChange, flush, issue, isExpression] = WorkbenchSDK.useField(nodeId, field);

    const expressionProps = {
        value: value as string,
        isExpression,
        onToggleExpression: (val: boolean) => WorkbenchSDK.actions.field.setIsExpression(nodeId, field.id, val),
        onChange: (val: string) => onChange(val as any),
        onCommit: flush,
        nodeId,
        displayName: field.displayName,
        reconcile: field.reconcile,
        only: field.only,
        itemScoped: field.itemScoped,
        className,
    }

    return (
        <WithExpression {...expressionProps} tabClassName=''>
            {isExpression ?
                <>
                    <FieldLabel field={field} />
                    <WithExpression.Input className={issue ? "border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50" : ""} />
                </>
            : field.kind === "tab" ?
                <div className=' flex flex-row'>
                    <FieldLabel field={field} />
                    <Tabs.Root
                        value={value as string}
                        onValueChange={val => { WorkbenchSDK.actions.field.setValue(nodeId, field, val); }}
                        className={`ml-auto ${issue ? "border-2 border-destructive rounded-md animate-border-ping ring-1 ring-destructive/50" : ""}`}
                    >
                        <Tabs.List size="sm">
                            {field.options.map((opt) => (
                                <Tabs.Trigger key={opt.value} value={opt.value}>{opt.displayName ?? opt.value}</Tabs.Trigger>
                            ))}
                        </Tabs.List>
                    </Tabs.Root>
                </div>
                :
                <>
                    <FieldLabel field={field} />
                    <Select.Root
                        value={value as string}
                        onValueChange={(value) => { WorkbenchSDK.actions.field.setValue(nodeId, field, value) }}
                    >
                        <Select.Trigger className={`w-full ${issue ? "border-2 border-destructive animate-border-ping ring-1 ring-destructive/50" : ""}`}>
                            <Select.Value placeholder={field.placeholder}/>
                        </Select.Trigger>
                        <Select.Content size="sm">
                            {field.options.map((opt) => (
                                <Select.Item key={opt.value} value={opt.value} description={opt.description}>{opt.displayName ?? opt.value}</Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                </>
            }
        </WithExpression>
    )
})
MultiOptionField.displayName = "MultiOptionField"
