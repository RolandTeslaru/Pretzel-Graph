import { memo } from 'react'
import { Button, Input } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { WithExpression } from './withExpression'

export const ListField = memo<RendererProps<'List'>>(({ field, nodeId, className }) => {
    const [value, onChange, flush, issue, isExpression] = WorkbenchSDK.useField<string[] | string>(nodeId, field)
    const items = Array.isArray(value) ? value : []

    const updateItems = (next: string[], commit = false) => {
        onChange(next)
        if (commit)
            flush()
    }

    const expressionProps = {
        value: typeof value === 'string' ? value : '',
        isExpression,
        onToggleExpression: (next: boolean) => WorkbenchSDK.actions.field.setIsExpression(nodeId, field.id, next),
        onChange: (next: string) => onChange(next),
        onCommit: flush,
        nodeId,
        displayName: field.displayName,
        reconcile: field.reconcile,
        only: field.only,
        itemScoped: field.itemScoped,
        className,
    }

    const errorClass = issue
        ? 'border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50'
        : ''

    return (
        <WithExpression {...expressionProps} togglePlacement='manual'>
            <div className='flex w-full flex-row items-center'>
                <FieldLabel field={field} />
                <div className='ml-auto flex flex-row items-center gap-1'>
                    <WithExpression.Toggle />
                    {!isExpression && (
                        <Button
                            type='button'
                            variant='ghost'
                            size='xs'
                            onClick={() => updateItems([...items, ''])}
                        >
                            <SystemIcons.Plus className='size-3' /> Add Item
                        </Button>
                    )}
                </div>
            </div>

            {isExpression ? (
                <WithExpression.Input className={errorClass} />
            ) : (
                <div className='flex flex-col gap-1'>
                    {items.map((item, index) => (
                        <div key={index} className='flex flex-row gap-1'>
                            <Input
                                size='xs'
                                value={item}
                                aria-label={`${field.displayName} item ${index + 1}`}
                                placeholder={`Item ${index + 1}`}
                                autoFocus={index === items.length - 1 && item === ''}
                                className={errorClass}
                                onChange={event => {
                                    const next = [...items]
                                    next[index] = event.currentTarget.value
                                    updateItems(next)
                                }}
                                onBlur={() => updateItems(items.map(value => value.trim()).filter(Boolean), true)}
                            />
                            <Button
                                type='button'
                                variant='ghost-destructive'
                                size='icon-xs'
                                aria-label={`Remove ${field.displayName} item ${index + 1}`}
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index), true)}
                            >
                                <SystemIcons.Trash className='size-3!' />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </WithExpression>
    )
})

ListField.displayName = 'ListField'
