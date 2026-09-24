import { useEffect, useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertDialog, Button, Dialog, Form, Input, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { VaultSDK } from '../sdk'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import type { Vault } from '@pretzel-graph/shared/domain'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { VaultGlyph } from '@pretzel-graph/standard-ui/brands/vaultGlyph'
import { awaitOAuthConnection, openOAuthPopup } from '../oauthPopup'
import { DerivableForm, derivableResolver, getDefaultFieldValues } from '@/components/DerivableForm'

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
        contentClassName='p-0!'
        sidebarClassName='w-[280px]'
        sidebarRenderer={() => (
            <DialogSDK.SplitTemplate.Header>
                <DialogSDK.SplitTemplate.Icon icon={VaultGlyph} size="lg" />
                <DialogSDK.SplitTemplate.Title>Vault Manager</DialogSDK.SplitTemplate.Title>
                <DialogSDK.SplitTemplate.Description>
                    Stores and manages credentials securely.
                </DialogSDK.SplitTemplate.Description>
            </DialogSDK.SplitTemplate.Header>
        )}
    >
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
    const formTemplate = useMemo(
        () => isOAuth && updateProps ? { ...credentialTemplate, fields: [] } : credentialTemplate,
        [credentialTemplate, isOAuth, updateProps],
    )

    // An OAuth credential can take its name from the connected account.
    const nameSchema = useMemo(() => z.object({
        name: isOAuth ? z.string().trim() : z.string().trim().min(1, 'Name is required'),
    }), [isOAuth])

    type Values = {
        name:        string
        fieldValues: Record<string, unknown>
    }

    const form = useForm<Values>({
        resolver: derivableResolver(formTemplate, nameSchema),
        defaultValues: {
            name:        '',
            fieldValues: getDefaultFieldValues(formTemplate),
        },
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
                    form.reset({ name, fieldValues: {} })
                    return
                }

                form.reset({ name, fieldValues })
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

            await VaultSDK.fetch({ ...VaultSDK.query.instances, staleTime: 0 })

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
                fieldValues: values.fieldValues as Vault.Credential.Instance.DecryptedValues,
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
                    fieldValues: values.fieldValues as Vault.Credential.Instance.DecryptedValues,
                })
                toast.success(`${credentialTemplate.displayName} credential updated`)
                updateProps.onUpdateComplete?.(updateProps.instanceId)
            } else {
                const instance = await VaultSDK.actions.instance.create({
                    name: values.name,
                    templateId: credentialTemplate.id,
                    fieldValues: values.fieldValues as Vault.Credential.Instance.DecryptedValues,
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
            <Dialog.FloatingHeader
                icon={<IconRenderer name={credentialTemplate.icon ?? ""} />}
                title={`${updateProps ? 'Edit' : 'Add'} ${credentialTemplate.displayName} Credentials`}
            />

            <Dialog.MaskedScrollArea className='h-[500px] w-[500px]'>
                <Form.Root {...form}>
                    <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-3' autoComplete='off'>

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

                        <DerivableForm derivable={formTemplate} control={form.control} />

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
            </Dialog.MaskedScrollArea>

            <Dialog.FloatingFooter>
                {updateProps && (
                    <Dialog.Action variant='ghost-destructive' onClick={onRemove} loading={isRemoving} disabled={form.formState.isSubmitting}>
                        Remove
                    </Dialog.Action>
                )}
                <Dialog.Action type='submit' form={formId} loading={form.formState.isSubmitting || isConnecting} disabled={isLoadingValues || isRemoving}>
                    {isOAuth && !updateProps ? `Connect with ${credentialTemplate.displayName}` : 'Save'}
                </Dialog.Action>
            </Dialog.FloatingFooter>
        </>
    )
}
