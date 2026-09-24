import { memo, useMemo, useState } from 'react'
import { Select } from "@pretzel-graph/standard-ui/foundations/select"
import { SearchInput, Tabs } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { WithExpression } from './withExpression'

export const MultiOptionField = memo<RendererProps<'MultiOption'>>(({ field, nodeId, className }) => {
    const [value, onChange, flush, issue, isExpression] = WorkbenchSDK.useField(nodeId, field);

    const [query, setQuery] = useState('')

    const hasSearch = field.search

    // Matched on both halves: the display name is what is read, the value is what expressions use.
    const matches = useMemo(() => {
        const needle = query.trim().toLowerCase()

        if (!hasSearch || !needle)
            return null;

        return new Set(field.options
            .filter(option =>
                option.value.toLowerCase().includes(needle)
                || option.displayName?.toLowerCase().includes(needle))
            .map(option => option.value))
    }, [field.options, hasSearch, query])

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
                        onOpenChange={open => { if (!open) setQuery('') }}
                    >
                        <Select.Trigger className={`w-full ${issue ? "border-2 border-destructive animate-border-ping ring-1 ring-destructive/50" : ""}`}>
                            <Select.Value placeholder={field.placeholder}/>
                        </Select.Trigger>
                        <Select.Content size="sm" className={hasSearch ? "pt-8" : ""}>
                            {hasSearch &&
                                // Radix moves focus to an item on every keystroke, so the box keeps its own.
                                <div
                                    className='z-10 fixed top-1 left-1 right-1'
                                    onKeyDown={event => event.stopPropagation()}
                                >
                                    <SearchInput onSearch={setQuery} delay={0} autoFocus className='h-7 rounded-md!' />
                                </div>
                            }
                            {field.options.map((opt) => (
                                // Hidden rather than removed: an item that unmounts takes the focus with it.
                                <Select.Item
                                    key={opt.value}
                                    value={opt.value}
                                    description={opt.description}
                                    className={matches && !matches.has(opt.value) ? 'hidden' : ''}
                                >
                                    {opt.displayName ?? opt.value}
                                </Select.Item>
                            ))}
                            {matches && !matches.size &&
                                <p className='px-2 py-1.5 text-xs text-muted-foreground'>No matches</p>
                            }
                        </Select.Content>
                    </Select.Root>
                </>
            }
        </WithExpression>
    )
})
MultiOptionField.displayName = "MultiOptionField"
