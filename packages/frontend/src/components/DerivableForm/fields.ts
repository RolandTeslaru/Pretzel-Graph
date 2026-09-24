import { z } from 'zod'
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field'

// The zod schema a field's form value must satisfy.
export const createFieldSchema = (field: Field) => {
    switch (field.variant) {
        case 'Boolean':
            return z.boolean()

        case 'Integer':
        case 'Float':
            return field.required
                ? z.number()
                : z.union([z.number(), z.literal('')])

        case 'MultiOption':
            return z.string().refine(
                value =>
                    (!field.required && value === '') ||
                    field.options.some(option => option.value === value),
                `Select a valid ${field.displayName}`,
            )

        case 'List':
            return field.required
                ? z.array(z.string()).min(1, `${field.displayName} is required`)
                : z.array(z.string())

        default:
            return field.required
                ? z.string().min(1, `${field.displayName} is required`)
                : z.string()
    }
}

// The value a field starts with when it first appears in the form.
export const getFieldDefaultValue = (field: Field) => {
    switch (field.variant) {
        case 'Boolean':
            return field.initialValue ?? false

        case 'Integer':
        case 'Float':
            return field.initialValue ?? (field.required ? 0 : '')

        case 'MultiOption':
            return field.initialValue ?? ''

        case 'List':
            return field.initialValue ?? []

        case 'String':
            return field.initialValue ?? ''

        default:
            return ''
    }
}
