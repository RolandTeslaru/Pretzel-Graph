import { type WheelEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertDialog, Button, Form, Input, ScrollArea, Select, Spinner, Switch } from '@pretzel-graph/standard-ui/foundations'
import { VaultSDK } from '../sdk'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import type { Vault } from '@pretzel-graph/shared/domain'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { VaultGlyph } from '@pretzel-graph/standard-ui/brands/vaultGlyph'

interface UpdateProps {
    instanceId: Vault.Credential.Instance.Id
    onUpdateComplete?: (instanceId: Vault.Credential.Instance.Id) => void
    onRemoved?: () => void
}

interface Props {
    credentialTemplate: Vault.Credential.Template
    onCreated?: (instanceId: Vault.Credential.Instance.Id) => void
    updateProps?: UpdateProps
}

type CredentialField = Vault.Credential.Template['fields'][number]

const createFieldSchema = (field: CredentialField) => {
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

        default:
            return field.required
                ? z.string().min(1, `${field.displayName} is required`)
                : z.string()
    }
}

const getFieldDefaultValue = (field: CredentialField) => {
    switch (field.variant) {
        case 'Boolean':
            return field.initialValue ?? false

        case 'Integer':
        case 'Float':
            return field.initialValue ?? (field.required ? 0 : '')

        case 'MultiOption':
            return field.initialValue ?? ''

        case 'String':
            return field.initialValue ?? ''

        default:
            return ''
    }
}

export const CredentialForm = ({ credentialTemplate, onCreated, updateProps }: Props) => {
    // ScrollArea.Root forwards its ref to the underlying viewport.
    const viewportRef = useRef<HTMLDivElement>(null)

    // The footer sits outside <form> (it's pinned over the scroll area), so Save links back by id.
    const formId = useId()

    const [isLoadingValues, setIsLoadingValues] = useState(Boolean(updateProps))
    const [isRemoving, setIsRemoving] = useState(false)

    const schema = useMemo(() => z.object({
        name: z.string().trim().min(1, 'Name is required'),
        fields: z.object(
            Object.fromEntries(
                credentialTemplate.fields.map(field => [
                    field.id,
                    createFieldSchema(field),
                ]),
            ),
        ),
    }), [credentialTemplate])

    type Values = z.infer<typeof schema>

    const getDefaultValues = (): Values => ({
        name: '',
        fields: Object.fromEntries(
            credentialTemplate.fields.map(field => [
                field.id,
                getFieldDefaultValue(field),
            ]),
        ) as Values['fields'],
    })

    const form = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: getDefaultValues(),
    })

    useEffect(() => {
        if (!updateProps)
            return

        setIsLoadingValues(true)

        VaultSDK.actions.instance.reveal(updateProps.instanceId)
            .then(fieldValues => {
                const name = VaultSDK.state.credentialInstances[updateProps.instanceId]?.name ?? ''
                form.reset({ name, fields: fieldValues as Values['fields'] })
            })
            .catch(() => {})
            .finally(() => setIsLoadingValues(false))
    }, [updateProps?.instanceId])

    const onSubmit = async (values: Values) => {
        try {
            if (updateProps) {
                await VaultSDK.actions.instance.update.values({
                    id: updateProps.instanceId,
                    name: values.name,
                    fieldValues: values.fields,
                })
                toast.success(`${credentialTemplate.displayName} credential updated`)
                updateProps.onUpdateComplete?.(updateProps.instanceId)
            } else {
                const instance = await VaultSDK.actions.instance.create({
                    name: values.name,
                    templateId: credentialTemplate.id,
                    fieldValues: values.fields,
                })
                toast.success(`${credentialTemplate.displayName} credential saved`)
                onCreated?.(instance.id)
            }
        } catch {
            // SDK already toasted
        }
    }

    const onRemove = () => {
        if (!updateProps)
            return

        const dialogId = `remove-credential-${updateProps.instanceId}`
        DialogSDK.actions.push(dialogId, props => (
            <DialogSDK.AlertTemplate
                {...props}
                type='danger'
                onApprove={async () => {
                    setIsRemoving(true)
                    try {
                        await VaultSDK.actions.instance.remove(updateProps.instanceId)
                        DialogSDK.actions.pop(dialogId)
                        updateProps.onRemoved?.()
                    } finally {
                        setIsRemoving(false)
                    }
                }}
                onCancel={() => DialogSDK.actions.pop(dialogId)}
            >
                <AlertDialog.Title>Are you sure?</AlertDialog.Title>
                <AlertDialog.Description>
                    Deleting {credentialTemplate.displayName} credential cannot be undone.
                    Workflows using it will stop working.
                </AlertDialog.Description>
            </DialogSDK.AlertTemplate>
        ))
    }

    // Something upstream eats the wheel before it reaches the viewport, so drive it by hand.
    // No preventDefault — React registers wheel as passive, where it only warns.
    const onWheel = (event: WheelEvent<HTMLDivElement>) => {
        const viewport = viewportRef.current
        if (!viewport || event.deltaY === 0)
            return

        event.stopPropagation()
        viewport.scrollTop += event.deltaY
    }

    return (
        <div className='flex flex-row w-[600px] h-[500px] overflow-hidden rounded-2xl'>
            {/* Left sidebar */}
            <div className='w-[180px] flex flex-col gap-2 shrink-0 py-4 pl-4'>
                <div className='flex flex-row items-center gap-2'>
                    <VaultGlyph className='size-10 shrink-0' />
                    <p className='text-lg font-semibold text-foreground'>Vault</p>
                </div>
                <p className='text-xs text-muted-foreground'>Stores and manages credentials securely.</p>
            </div>

            <div className='h-full bg-border w-[1px]' />

            {/* Right column */}
            <div className='flex flex-col flex-1 h-full relative' onWheelCapture={onWheel}>
                {/* Header */}
                <div className='pointer-events-none absolute top-0 left-0 z-90 flex flex-row gap-2 items-center px-4 pt-6 pb-4'>
                    <LazyIcon name={credentialTemplate.icon ?? ""} className='size-5' />
                    <p className='text-sm font-semibold text-foreground'>
                        {updateProps ? 'Edit' : 'Add'} {credentialTemplate.displayName} Credentials
                    </p>
                </div>
                {/* Content */}
                <ScrollArea.Root ref={viewportRef} className="h-full [mask-image:linear-gradient(to_bottom,transparent_0,transparent_40px,black_80px,black_calc(100%-80px),transparent_calc(100%-40px),transparent_100%)]">
                    <Form.Root {...form}>
                        <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className='relative min-h-full pt-16 pb-20 flex flex-col gap-3 px-4' autoComplete='off'>

                            <Form.Field control={form.control} name='name' render={({ field }) => (
                                <Form.Item>
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control>
                                        <Input
                                            {...field}
                                            placeholder={`e.g. ${credentialTemplate.displayName} credentials`}
                                            autoFocus
                                            autoComplete='off'
                                        />
                                    </Form.Control>
                                    <Form.Message />
                                </Form.Item>
                            )} />

                            {credentialTemplate.fields.map(f => (
                                <Form.Field key={f.id} control={form.control} name={`fields.${f.id}`} render={({ field }) => (
                                    <Form.Item>
                                        <Form.Label>
                                            {f.displayName}
                                            {f.required && <span className='ml-1 text-destructive'>*</span>}
                                        </Form.Label>
                                        <Form.Control>
                                            {f.variant === 'Boolean' ? (
                                                <Switch
                                                    checked={Boolean(field.value)}
                                                    onCheckedChange={field.onChange}
                                                />
                                            ) : (f.variant === 'Integer' || f.variant === 'Float') ? (
                                                <Input
                                                    type='number'
                                                    value={(field.value ?? '') as number | ''}
                                                    onChange={e => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)}
                                                    onBlur={field.onBlur}
                                                    name={field.name}
                                                    ref={field.ref}
                                                    placeholder={'placeholder' in f ? (f.placeholder as string) : undefined}
                                                />
                                            ) : f.variant === 'MultiOption' ? (
                                                <Select.Root
                                                    value={field.value as string}
                                                    onValueChange={field.onChange}
                                                >
                                                    <Select.Trigger aria-invalid={Boolean(form.formState.errors.fields?.[f.id])}>
                                                        <Select.Value placeholder={f.placeholder ?? `Select ${f.displayName}`} />
                                                    </Select.Trigger>
                                                    <Select.Content size='sm'>
                                                        {f.options.map(option => (
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
                                            ) : (
                                                <Input
                                                    {...field}
                                                    value={field.value as string}
                                                    type={f.variant === 'Password' ? 'password' : 'text'}
                                                    placeholder={'placeholder' in f ? (f.placeholder as string) : undefined}
                                                    autoComplete='new-password'
                                                />
                                            )}
                                        </Form.Control>
                                        <Form.Message />
                                    </Form.Item>
                                )} />
                            ))}

                        </form>
                    </Form.Root>
                </ScrollArea.Root>

                {/* Footer */}
                <div className='pointer-events-none absolute bottom-0 left-0 right-0 pt-2 px-4 pb-4 pt-2 mt-auto w-full flex'>
                    <div className='ml-auto gap-2 flex'>
                        {updateProps ? (
                            <Button type='button' variant='ghost-destructive' className='pointer-events-auto rounded-full' onClick={onRemove} disabled={isRemoving || form.formState.isSubmitting}>
                                {isRemoving && <Spinner className='mr-2 h-4 w-4' />}
                                Remove
                            </Button>
                        ) : <div />}
                        <Button type='submit' form={formId} className='pointer-events-auto rounded-full' disabled={form.formState.isSubmitting || isLoadingValues || isRemoving}>
                            {form.formState.isSubmitting && <Spinner className='mr-2 h-4 w-4' />}
                            Save
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
