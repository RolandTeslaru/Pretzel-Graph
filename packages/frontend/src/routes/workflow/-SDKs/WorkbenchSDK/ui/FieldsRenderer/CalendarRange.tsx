import { memo } from 'react'
import type { DateRange } from 'react-day-picker'
import { CalendarRange as CalendarRangeInput } from '@pretzel-graph/standard-ui/foundations/calendar-range'
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'

const parseDate = (value?: string): Date | undefined => {
    if (!value) return undefined

    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) return undefined

    const date = new Date(year, month - 1, day)
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        ? date
        : undefined
}

const serializeDate = (value?: Date): string | undefined => {
    if (!value) return undefined

    const year  = String(value.getFullYear()).padStart(4, '0')
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day   = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const toDateRange = (value: Field.CalendarRange.Value): DateRange => ({
    from: parseDate(value.from),
    to:   parseDate(value.to),
})

const fromDateRange = (value?: DateRange): Field.CalendarRange.Value => {
    const from = serializeDate(value?.from)
    const to   = serializeDate(value?.to)

    return {
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
    }
}

export const CalendarRangeField = memo<RendererProps<'CalendarRange'>>(({ field, nodeId, className }) => {
    const [value, , , issue] = WorkbenchSDK.useField<Field.CalendarRange.Value>(nodeId, field)

    return (
        <div className={className}>
            <FieldLabel field={field} />
            <CalendarRangeInput
                className={`w-full ${issue ? 'border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50' : ''}`}
                maxDate={parseDate(field.maxDate)}
                onValueChange={(next) => WorkbenchSDK.actions.field.setValue(nodeId, field, fromDateRange(next))}
                placeholder={field.placeholder}
                value={toDateRange(value ?? field.initialValue)}
            />
        </div>
    )
})
CalendarRangeField.displayName = 'CalendarRangeField'
