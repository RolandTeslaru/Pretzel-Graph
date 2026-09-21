import { useState } from 'react'
import type { ControllerRenderProps, FieldValues as FormValues } from 'react-hook-form'
import { Input, Select, Switch } from '@pretzel-graph/standard-ui/foundations'
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field'

type Props = ControllerRenderProps<FormValues, string> & {
    definition: Field
    invalid:    boolean
}

const placeholderFor = (definition: Field) =>
    'placeholder' in definition ? (definition.placeholder as string | undefined) : undefined

// The input for one field, chosen by its variant.
export const FieldInput = ({ definition, invalid, ref, ...field }: Props) => {
    switch (definition.variant) {
        case 'Boolean':
            return (
                <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                />
            )

        case 'Integer':
        case 'Float':
            return (
                <Input
                    type='number'
                    value={(field.value ?? '') as number | ''}
                    onChange={e => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={ref}
                    placeholder={placeholderFor(definition)}
                />
            )

        case 'MultiOption':
            return (
                <Select.Root
                    value={field.value as string}
                    onValueChange={field.onChange}
                >
                    <Select.Trigger aria-invalid={invalid}>
                        <Select.Value placeholder={placeholderFor(definition) ?? `Select ${definition.displayName}`} />
                    </Select.Trigger>
                    <Select.Content size='sm'>
                        {definition.options.map(option => (
                            <Select.Item
                                key={option.value}
                                value={option.value}
                                description={option.description}
                            >
                                {option.displayName ?? option.value}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>
            )

        case 'List':
            return <ListInput {...field} ref={ref} definition={definition} />

        default:
            return (
                <Input
                    {...field}
                    ref={ref}
                    value={field.value as string}
                    type={definition.variant === 'Password' ? 'password' : 'text'}
                    placeholder={placeholderFor(definition)}
                    autoComplete='new-password'
                />
            )
    }
}


// Entered as one comma-separated line; the raw text is kept so a trailing comma survives typing.
const ListInput = ({ definition, ref, ...field }: Omit<Props, 'invalid'>) => {
    const [text, setText] = useState(((field.value ?? []) as string[]).join(', '))

    return (
        <Input
            value={text}
            onChange={e => {
                setText(e.target.value)

                field.onChange(
                    e.target.value
                        .split(',')
                        .map(item => item.trim())
                        .filter(Boolean),
                )
            }}
            onBlur={field.onBlur}
            name={field.name}
            ref={ref}
            placeholder={placeholderFor(definition) ?? 'Comma-separated'}
            autoComplete='off'
        />
    )
}
