import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button, Form, Input, Spinner, Switch } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { VaultSDK } from '@/SDKs/VaultSDK/sdk'
import type { Vault } from '@pretzel-graph/shared/domain'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { VaultGlyph } from '@pretzel-graph/standard-ui/brands/vaultGlyph'

interface Props {
    credentialTemplate: Vault.Credential.Template
    dialogId: string
    onCreated?: (instanceId: Vault.Credential.Instance.Id) => void
}

export const AddCredentialDialog = ({ credentialTemplate, dialogId, onCreated }: Props) => {
    const schema = useMemo(() => z.object({
        name: z.string().trim().min(1, 'Name is required'),
        fields: z.object(
            Object.fromEntries(credentialTemplate.fields.map(f => [
                f.id,
                f.variant === 'Boolean' ? z.boolean()
                    : (f.variant === 'Integer' || f.variant === 'Float') ? z.number()
                    : f.required ? z.string().min(1, `${f.displayName} is required`) : z.string(),
            ]))
        ),
    }), [credentialTemplate])

    type Values = z.infer<typeof schema>

    const form = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            fields: Object.fromEntries(credentialTemplate.fields.map(f => [
                f.id,
                f.variant === 'Boolean' ? (('initialValue' in f ? f.initialValue : false) ?? false)
                    : (f.variant === 'Integer' || f.variant === 'Float') ? (('initialValue' in f ? f.initialValue : 0) ?? 0)
                    : '',
            ])) as Values['fields'],
        },
    })

    const onSubmit = async (values: Values) => {
        try {
            const instance = await VaultSDK.actions.create({
                name: values.name,
                templateId: credentialTemplate.id,
                fieldValues: values.fields,
            })
            toast.success(`${credentialTemplate.displayName} credential saved`)
            onCreated?.(instance.id)
            DialogSDK.actions.pop(dialogId)
        } catch {
            // SDK already toasted
        }
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
            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-3 pt-6 pb-4 px-4 flex-1 h-full overflow-y-auto' autoComplete='off'>
                    <div className='flex flex-row gap-2 items-center'>
                        <LazyIcon name={credentialTemplate.icon ?? ""} className='size-5 text-muted-foreground' />
                        <p className='text-sm font-semibold text-foreground'>
                            Add {credentialTemplate.displayName} Credentials
                        </p>
                    </div>

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
                                            value={field.value as number}
                                            onChange={e => field.onChange(e.target.valueAsNumber)}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            ref={field.ref}
                                            placeholder={'placeholder' in f ? (f.placeholder as string) : undefined}
                                        />
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

                    <div className='pt-2 mt-auto flex justify-end gap-2'>
                        <Button type='button' variant='ghost' className='rounded-full' onClick={() => DialogSDK.actions.pop(dialogId)}>
                            Cancel
                        </Button>
                        <Button type='submit' className='rounded-full' disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Spinner className='mr-2 h-4 w-4' />}
                            Save
                        </Button>
                    </div>
                </form>
            </Form.Root>
        </div>
    )
}
