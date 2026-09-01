import { useEffect, useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertDialog, Button, Dialog, Form, Input, ScrollArea, Select, Spinner, Switch } from '@pretzel-graph/standard-ui/foundations'
import { VaultSDK } from '../sdk'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import type { Vault } from '@pretzel-graph/shared/domain'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { VaultGlyph } from '@pretzel-graph/standard-ui/brands/vaultGlyph'
import { awaitOAuthConnection, openOAuthPopup } from '../oauthPopup'

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

// The full dialog: SplitTemplate shell with the Vault sidebar, the form as the content half.
export const CredentialFormDialog = ({ credentialTemplate, onCreated, updateProps, ...templateProps }: Props & DialogSDK.TemplateProps) => (
    <DialogSDK.SplitTemplate
        {...templateProps}
        contentClassName='p-0! relative'
        sidebarClassName='w-[270px]'
        sidebarRenderer={() => (
            <div className='flex flex-col gap-2'>
                <div className='flex flex-row items-center gap-2'>
                    <VaultGlyph className='size-10 shrink-0' />
                    <p className='text-lg font-semibold text-foreground'>Vault</p>
                </div>

                <p className='text-xs text-muted-foreground'>Stores and manages credentials securely.</p>
            </div>
        )}
    >
        <Dialog.Title className='hidden'>
            {updateProps ? 'Edit' : 'Add'} {credentialTemplate.displayName} Credentials
        </Dialog.Title>
        <Dialog.Description className='hidden'>
            {updateProps ? 'Edit this credential' : `Add a new ${credentialTemplate.displayName} credential`}
        </Dialog.Description>
        <CredentialForm
            credentialTemplate={credentialTemplate}
            onCreated={onCreated}
            updateProps={updateProps}
        />
    </DialogSDK.SplitTemplate>
)

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

    // The footer sits outside <form> (it's pinned over the scroll area), so Save links back by id.
    const formId = useId()

    const [isLoadingValues, setIsLoadingValues] = useState(Boolean(updateProps))
    const [isRemoving, setIsRemoving] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [redirectUri, setRedirectUri] = useState<string | null>(null)
    const [accountLabel, setAccountLabel] = useState<string | null>(null)

    const isOAuth = credentialTemplate.auth?.kind === 'oauth2'

    // Once connected, the form fields are replaced by a Reconnect button.
    const formFields = isOAuth && updateProps ? [] : credentialTemplate.fields

    const schema = useMemo(() => z.object({
        // An OAuth credential can take its name from the connected account.
        name: isOAuth ? z.string().trim() : z.string().trim().min(1, 'Name is required'),
        fields: z.object(
            Object.fromEntries(
                formFields.map(field => [
                    field.id,
                    createFieldSchema(field),
                ]),
            ),
        ),
    }), [isOAuth, formFields])

    type Values = z.infer<typeof schema>

    const getDefaultValues = (): Values => ({
        name: '',
        fields: Object.fromEntries(
            formFields.map(field => [
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

                if (isOAuth) {
                    const revealedAccountLabel = fieldValues['accountLabel' as keyof Vault.Credential.Instance.DecryptedValues]

                    setAccountLabel(typeof revealedAccountLabel === 'string' ? revealedAccountLabel : null)
                    form.reset({ name, fields: {} as Values['fields'] })
                    return
                }

                form.reset({ name, fields: fieldValues as Values['fields'] })
            })
            .catch(() => {})
            .finally(() => setIsLoadingValues(false))
    }, [updateProps?.instanceId])

    useEffect(() => {
        if (!isOAuth || updateProps)
            return

        VaultSDK.actions.oauth.redirectUri()
            .then(setRedirectUri)
            .catch(() => {})
    }, [isOAuth, updateProps])

    // The popup opens before the backend call so the browser counts it as user-initiated.
    const connect = async (mintAuthorizeUrl: () => Promise<string>): Promise<Vault.Credential.Instance.Id | null> => {
        const popup = openOAuthPopup()

        setIsConnecting(true)
        try {
            const authorizeUrl = await mintAuthorizeUrl()
            const instanceId   = await awaitOAuthConnection(popup, authorizeUrl)

            await VaultSDK.actions.instance.refreshAll()

            return instanceId
        } catch (err) {
            popup?.close()
            toast.error((err as Error).message)
            return null
        } finally {
            setIsConnecting(false)
        }
    }

    const onReconnect = async () => {
        if (!updateProps)
            return

        const instanceId = await connect(() => VaultSDK.actions.oauth.reconnect(updateProps.instanceId))

        if (!instanceId)
            return

        toast.success(`${credentialTemplate.displayName} reconnected`)
        updateProps.onUpdateComplete?.(instanceId)
    }

    const onSubmit = async (values: Values) => {
        if (isOAuth && !updateProps) {
            const instanceId = await connect(() => VaultSDK.actions.oauth.start({
                templateId:  credentialTemplate.id,
                name:        values.name,
                fieldValues: values.fields,
            }))

            if (!instanceId)
                return

            toast.success(`${credentialTemplate.displayName} connected`)
            onCreated?.(instanceId)
            return
        }

        if (isOAuth && updateProps) {
            try {
                await VaultSDK.actions.instance.update.name(updateProps.instanceId, values.name)
                toast.success(`${credentialTemplate.displayName} credential updated`)
                updateProps.onUpdateComplete?.(updateProps.instanceId)
            } catch {
                // SDK already toasted
            }
            return
        }

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


    return (
        <>
            {/* Header */}
            <div className='pointer-events-none absolute top-0 w-full left-0 z-90 flex flex-row gap-2 items-center px-4 pt-6 pb-4'>
                <IconRenderer name={credentialTemplate.icon ?? ""} className='size-5' />
                <p className='text-sm font-semibold text-foreground'>
                    {updateProps ? 'Edit' : 'Add'} {credentialTemplate.displayName} Credentials
                </p>
            </div>
            {/* Content */}
            <ScrollArea.Root className="h-[500px]  w-[500px] [mask-image:linear-gradient(to_bottom,transparent_0,transparent_0px,black_80px)]">
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

                        {formFields.map(f => (
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

                        {isOAuth && !updateProps && (
                            <div className='flex flex-col gap-1.5'>
                                <span className='text-sm font-medium'>Redirect URI</span>
                                <div className='flex items-center gap-1.5'>
                                    <Input readOnly value={redirectUri ?? ''} className='font-mono text-xs' />
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='icon-xs'
                                        disabled={!redirectUri}
                                        onClick={() => {
                                            if (!redirectUri)
                                                return

                                            navigator.clipboard.writeText(redirectUri)
                                            toast.success('Redirect URI copied')
                                        }}
                                    >
                                        <SystemIcons.Copy />
                                    </Button>
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                    Add this as an authorized redirect URI on the OAuth client in {credentialTemplate.displayName}'s developer console.
                                </p>
                            </div>
                        )}

                        {isOAuth && updateProps && !isLoadingValues && (
                            <div className='flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2'>
                                <div className='flex flex-col min-w-0'>
                                    <span className='text-xs text-muted-foreground'>Connected account</span>
                                    <span className='text-sm truncate'>{accountLabel ?? 'Unknown'}</span>
                                </div>
                                <Button type='button' variant='outline' size='sm' onClick={onReconnect} disabled={isConnecting}>
                                    {isConnecting && <Spinner className='mr-2 h-4 w-4' />}
                                    Reconnect
                                </Button>
                            </div>
                        )}

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
                    <Button type='submit' form={formId} className='pointer-events-auto rounded-full' disabled={form.formState.isSubmitting || isLoadingValues || isRemoving || isConnecting}>
                        {(form.formState.isSubmitting || isConnecting) && <Spinner className='mr-2 h-4 w-4' />}
                        {isOAuth && !updateProps ? `Connect with ${credentialTemplate.displayName}` : 'Save'}
                    </Button>
                </div>
            </div>
        </>
    )
}
