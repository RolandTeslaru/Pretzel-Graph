import { memo, useState } from 'react'
import { Foundations } from '@pretzel-graph/shared/domain'
import { Popover } from '@pretzel-graph/standard-ui/foundations/popover'
import { Input } from '@pretzel-graph/standard-ui/foundations/input'
import { Select } from '@pretzel-graph/standard-ui/foundations/select'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { WorkbenchSDK } from '../../../sdk'
import { FieldLabel } from '../FieldLabel'
import type { RendererProps } from '../FieldLabel'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { PopoverContent } from './popover-content'

type RLValue = Foundations.Field.ResourceLoader.Value
type Option = Foundations.Field.ResourceLoader.OptionItem

export const ResourceLoaderField = memo<RendererProps<'ResourceLoader'>>(({ field, nodeId, className }) => {
    const [storedValue, , , issue] = WorkbenchSDK.useField<RLValue>(nodeId, field)
    const value = storedValue ?? { mode: 'list', value: '' }

    const [open, setOpen] = useState(false)

    const selectOption = (option: Option) => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, { mode: 'list', value: option.value } satisfies RLValue)
        setOpen(false)
    }

    const setMode = (mode: RLValue['mode']) => {
        if (mode === value.mode) return
        const next: RLValue = mode === 'manual'
            ? { mode: 'manual', value: value.value }
            : { mode: 'list', value: '' }
        WorkbenchSDK.actions.field.setValue(nodeId, field, next)
        setOpen(false)
    }

    const displayText = value.value || ''
    const hasIssue = !!issue

    const modeSelect = (
        <Select.Root value={value.mode} onValueChange={v => setMode(v as RLValue['mode'])}>
            <Select.Trigger size="xs" className="shrink-0 w-auto ">
                <Select.Value />
            </Select.Trigger>
            <Select.Content size='xs'>
                <Select.Item value="list">by List</Select.Item>
                <Select.Item value="manual">by Search</Select.Item>
            </Select.Content>
        </Select.Root>
    )

    return (
        <div className={cn(className, 'w-full nodrag cursor-auto flex flex-col gap-1')}>
            <FieldLabel field={field} />

            {value.mode === 'manual' ? (
                <div className="flex items-center gap-1">
                    {modeSelect}
                    <Input
                        value={displayText}
                        placeholder={field.placeholder ?? `Enter ${field.displayName}`}
                        onChange={e => WorkbenchSDK.actions.field.setValue(
                            nodeId, field, { mode: 'manual', value: e.target.value } satisfies RLValue
                        )}
                        size='xs'
                        className={cn('flex-1 text-xs', hasIssue && 'border-destructive')}
                    />
                </div>
            ) : (
                <Popover.Root open={open} onOpenChange={setOpen}>
                    <div className="flex items-center gap-1">
                    {modeSelect}
                        <Popover.Trigger asChild className="flex-1" disableStyling>
                            <Button
                                variant="outline"
                                className={cn(
                                    'w-full flex transition-colors text-left! text-xs',
                                    hasIssue && 'border-destructive',
                                    !displayText && 'text-muted-foreground',
                                )}
                                size="xs"
                            >
                                <span className="truncate mr-auto">{displayText || field.placeholder || `Select ${field.displayName}`}</span>
                            </Button>
                        </Popover.Trigger>
                    </div>

                    <Popover.Content className="w-72 p-0" align="end">
                        <PopoverContent
                            nodeId={nodeId}
                            field={field}
                            selectedValue={value.value}
                            onSelect={selectOption}
                        />
                    </Popover.Content>
                </Popover.Root>
            )}
        </div>
    )
})
ResourceLoaderField.displayName = 'ResourceLoaderField'
