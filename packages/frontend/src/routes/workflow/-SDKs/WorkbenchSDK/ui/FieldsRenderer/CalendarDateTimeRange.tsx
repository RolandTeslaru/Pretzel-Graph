import { memo } from 'react'
import {
    CalendarDateTimeRange as CalendarDateTimeRangeInput,
    type CalendarDateTimeRangeValue,
} from '@pretzel-graph/standard-ui/foundations/calendar-date-time-range'
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

const toInputValue = (value: Field.CalendarDateTimeRange.Value): CalendarDateTimeRangeValue => ({
    date:      parseDate(value.date),
    startTime: value.startTime,
    endTime:   value.endTime,
})

const fromInputValue = (value: CalendarDateTimeRangeValue): Field.CalendarDateTimeRange.Value => {
    const date = serializeDate(value.date)
    return {
        ...(date ? { date } : {}),
        startTime: value.startTime,
        endTime:   value.endTime,
    }
}

export const CalendarDateTimeRangeField = memo<RendererProps<'CalendarDateTimeRange'>>(({ field, nodeId, className }) => {
    const [value, , , issue] = WorkbenchSDK.useField<Field.CalendarDateTimeRange.Value>(nodeId, field)

    return (
        <div className={className}>
            <FieldLabel field={field} />
            <CalendarDateTimeRangeInput
                className={`w-full ${issue ? 'border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50' : ''}`}
                onValueChange={(next) => WorkbenchSDK.actions.field.setValue(nodeId, field, fromInputValue(next))}
                placeholder={field.placeholder}
                value={toInputValue(value ?? field.initialValue)}
            />
        </div>
    )
})
CalendarDateTimeRangeField.displayName = 'CalendarDateTimeRangeField'
