import { useState } from 'react'
import type { ControllerRenderProps, FieldValues as FormValues } from 'react-hook-form'
import { Checkbox, Form, Input, Select, Switch } from '@pretzel-graph/standard-ui/foundations'
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field'

type Props = ControllerRenderProps<FormValues, string> & {
    definition: Field
    invalid:    boolean
}

const placeholderFor = (definition: Field) =>
    'placeholder' in definition ? (definition.placeholder as string | undefined) : undefined

// One labelled field; a checkbox sits before its label, a switch after it, every other variant below it.
export const FieldInput = (props: Props) => {
    if (props.definition.variant === 'Boolean' && props.definition.appearance === 'checkbox') {
        return (
            <Form.Item>
                <div className='flex items-center gap-2'>
                    <Form.Control>
                        <FieldControl {...props} />
                    </Form.Control>
                    <FieldLabel definition={props.definition} />
                </div>
                <Form.Message />
            </Form.Item>
        )
    }

    if (props.definition.variant === 'Boolean') {
        return (
            <Form.Item>
                <div className='flex items-center justify-between gap-3'>
                    <FieldLabel definition={props.definition} />
                    <Form.Control>
                        <FieldControl {...props} />
                    </Form.Control>
                </div>
                <Form.Message />
            </Form.Item>
        )
    }

    return (
        <Form.Item>
            <FieldLabel definition={props.definition} />
            <Form.Control>
                <FieldControl {...props} />
            </Form.Control>
            <Form.Message />
        </Form.Item>
    )
}


const FieldLabel = ({ definition }: { definition: Field }) => (
    <Form.Label>
        {definition.displayName}
        {definition.required && <span className='ml-1 text-destructive'>*</span>}
    </Form.Label>
)


// The input for one field, chosen by its variant.
const FieldControl = ({ definition, invalid, ref, ...field }: Props) => {
    switch (definition.variant) {
        case 'Boolean':
            if (definition.appearance === 'checkbox') {
                return (
                    <Checkbox
                        className='shadow-none!'
                        checked={Boolean(field.value)}
                        onCheckedChange={checked => field.onChange(checked === true)}
                    />
                )
            }

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
