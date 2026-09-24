import { useWatch, type Control, type FieldValues as FormValues, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Derivable } from '@pretzel-graph/shared/domain/Foundations/Derivable'
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field'
import { createFieldSchema, getFieldDefaultValue } from './fields'

// Values always live under `fieldValues` in the parent form.
type FieldValues = Partial<Record<Field.Id, Field.Value>>

// The derivable as the form's current field values shape it.
export const useDerived = <T extends Derivable, V extends FormValues>(derivable: T, control: Control<V>): T => {
    const fieldValues = (useWatch({ control: control as unknown as Control<FormValues>, name: 'fieldValues' }) ?? {}) as FieldValues

    return Derivable.derive(derivable, fieldValues).derived
}

// Starting values for the fields the derivable shows before anything is chosen.
export const getDefaultFieldValues = (derivable: Derivable): Record<string, unknown> => {
    const { derived } = Derivable.derive(derivable, {})

    return Object.fromEntries(derived.fields.map(field => [field.id, getFieldDefaultValue(field)]))
}

// Validates `fieldValues` against the fields the submitted values derive to, plus the parent's own schema.
export const derivableResolver = <V extends FormValues>(derivable: Derivable, schema: z.ZodObject = z.object({})): Resolver<V> =>
    (values, context, options) => {
        const { derived } = Derivable.derive(derivable, (values.fieldValues ?? {}) as FieldValues)

        const full = schema.extend({
            fieldValues: z.object(
                Object.fromEntries(derived.fields.map(field => [field.id, createFieldSchema(field)])),
            ),
        })

        return (zodResolver(full) as unknown as Resolver<V>)(values, context, options)
    }
