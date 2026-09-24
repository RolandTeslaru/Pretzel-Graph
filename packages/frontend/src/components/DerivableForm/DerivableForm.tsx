import type { Control, FieldValues as FormValues, Path } from 'react-hook-form'
import { Form } from '@pretzel-graph/standard-ui/foundations'
import type { Derivable } from '@pretzel-graph/shared/domain/Foundations/Derivable'
import { FieldInput } from './FieldInput'
import { getFieldDefaultValue } from './fields'
import { useDerived } from './derive'

interface Props<V extends FormValues> {
    derivable: Derivable
    control:   Control<V>
}

// Renders the derived fields; a field a branch hides is unregistered, so its value is not submitted.
export const DerivableForm = <V extends FormValues>({ derivable, control }: Props<V>) => {
    const derived = useDerived(derivable, control)

    return (
        <>
            {derived.fields.map(definition => (
                <Form.Field
                    key={definition.id}
                    control={control}
                    name={`fieldValues.${definition.id}` as Path<V>}
                    defaultValue={getFieldDefaultValue(definition) as never}
                    shouldUnregister
                    render={({ field, fieldState }) => (
                        <FieldInput {...field} definition={definition} invalid={Boolean(fieldState.error)} />
                    )}
                />
            ))}
        </>
    )
}
