import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button, Dialog, Form, Input, ScrollArea, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Gateway, Library, Vault } from '@pretzel-graph/shared/domain'
import { DerivableForm, derivableResolver, getDefaultFieldValues, useDerived } from '@/components/DerivableForm'
import { CredentialPicker } from '@/SDKs/VaultSDK/ui/CredentialPicker'
import { GatewaySDK } from '../sdk'
import { ConnectionStatus } from './ConnectionStatus'

interface Props {
    definition: Gateway.Definition
    folderId:   Library.Folder.Id
    // Present when editing; its live row drives the status and the socket buttons.
    connection?: Gateway.Connection
    onCreated?: (connection: Gateway.Connection) => void
    onUpdated?: (connection: Gateway.Connection) => void
}

// The full dialog: SplitTemplate shell with the gateway sidebar, the form as the content half.
export const ConnectionFormDialog = ({ definition, folderId, connection, onCreated, onUpdated, ...templateProps }: Props & DialogSDK.TemplateProps) => (
    <DialogSDK.SplitTemplate
        {...templateProps}
        contentClassName='p-0! relative'
        sidebarClassName='w-[320px]'
        sidebarRenderer={() => (
            <DialogSDK.SplitTemplate.Header>
                <DialogSDK.SplitTemplate.Icon icon={SystemIcons.GatewayConnection} />
                <DialogSDK.SplitTemplate.Title>Gateway Manager</DialogSDK.SplitTemplate.Title>
                <DialogSDK.SplitTemplate.Description>
                    Keeps and manages live websocket connections to other services.
                </DialogSDK.SplitTemplate.Description>
            </DialogSDK.SplitTemplate.Header>
        )}
    >
        <Dialog.Title className='hidden'>
            {connection ? `Edit ${connection.name}` : `Add a ${definition.displayName} connection`}
        </Dialog.Title>
        <Dialog.Description className='hidden'>
            {connection ? `Edit this ${definition.displayName} connection` : `Add a new ${definition.displayName} connection`}
        </Dialog.Description>
        <ConnectionForm definition={definition} folderId={folderId} connection={connection} onCreated={onCreated} onUpdated={onUpdated} />
    </DialogSDK.SplitTemplate>
)

type Values = {
    name:          string
    fieldValues:   Record<string, unknown>
    credential_id: Vault.Credential.Instance.Id | null
}

const baseSchema = z.object({
    name:          z.string().trim().min(1, 'Name is required').max(128),
    credential_id: z.string().nullable(),
})

type SocketAction = 'connect' | 'disconnect' | 'reconnect'

export const ConnectionForm = ({ definition, folderId, connection, onCreated, onUpdated }: Props) => {

    // The footer sits outside <form> (it's pinned over the scroll area), so the submit button links back by id.
    const formId = useId()

    const [pendingAction, setPendingAction] = useState<SocketAction | null>(null)

    // The store's copy stays current through gateway events; the prop is only the row the dialog opened with.
    const live = GatewaySDK.useStore(s => connection ? s.connections[connection.id] ?? connection : null)

    const form = useForm<Values>({
        resolver: derivableResolver(definition, baseSchema),
        defaultValues: {
            name:          connection?.name ?? '',
            fieldValues:   { ...getDefaultFieldValues(definition), ...connection?.fieldValues },
            credential_id: connection?.credential?.id ?? null,
        },
    })

    // The credential the chosen field values call for, if any.
    const credentialTemplate = useDerived(definition, form.control).credentials?.[0] ?? null

    // A credential picked for another template no longer fits; the one the dialog opened with is kept.
    const openedTemplateId = useRef(credentialTemplate?.id)

    useEffect(() => {
        if (credentialTemplate?.id === openedTemplateId.current)
            return

        openedTemplateId.current = credentialTemplate?.id
        form.setValue('credential_id', null)
    }, [form, credentialTemplate?.id])

    const onSubmit = async (values: Values) => {
        if (credentialTemplate && !values.credential_id) {
            form.setError('credential_id', { message: `Pick a ${credentialTemplate.displayName} credential` })
            return
        }

        const fieldValues = values.fieldValues as Gateway.API.Connection.Create.Request['field_values']

        try {
            if (connection) {
                const updated = await GatewaySDK.actions.connection.update({
                    id:            connection.id,
                    name:          values.name,
                    credential_id: values.credential_id,
                    field_values:  fieldValues,
                })

                toast.success(`${updated.name} saved`)
                onUpdated?.(updated)
                return
            }

            const created = await GatewaySDK.actions.connection.create({
                folder_id:     folderId,
                definition_id: definition.id,
                name:          values.name,
                credential_id: values.credential_id ?? undefined,
                field_values:  fieldValues,
            })

            toast.success(`${definition.displayName} connection added`)
            onCreated?.(created)
        } catch {
            // SDK already toasted
        }
    }

    const runSocketAction = async (action: SocketAction) => {
        if (!connection)
            return

        setPendingAction(action)

        try {
            await GatewaySDK.actions.connection[action](connection.id)
        } catch {
            // SDK already toasted
        } finally {
            setPendingAction(null)
        }
    }

    const isBusy = form.formState.isSubmitting || pendingAction !== null

    return (
        <>
            {/* Header */}
            <div className='pointer-events-none absolute top-0 w-full left-0 z-90 flex flex-row gap-2 items-center px-4 pt-6 pb-4'>
                <IconRenderer name={definition.icon} className='size-5' />
                <p className='text-sm font-semibold text-foreground'>
                    {connection ? `Edit ${definition.displayName} connection` : `Add a ${definition.displayName} connection`}
                </p>
                {live && <ConnectionStatus status={live.status} className='ml-auto text-xs' />}
            </div>
            {/* Content */}
            <ScrollArea.Root className="h-[500px] w-[500px] [mask-image:linear-gradient(to_bottom,transparent_0,black_80px,black_calc(100%_-_80px),transparent_100%)]">
                <Form.Root {...form}>
                    <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className='relative min-h-full pt-16 pb-20 flex flex-col gap-3 px-4' autoComplete='off'>

                        {live?.status === 'failed' && live.error && (
                            <div className='rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
                                {live.error}
                            </div>
                        )}

                        <Form.Field control={form.control} name='name' render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Name</Form.Label>
                                <Form.Control>
                                    <Input
                                        {...field}
                                        placeholder={`e.g. My ${definition.displayName} connection`}
                                        autoFocus
                                        autoComplete='off'
                                    />
                                </Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )} />

                        <DerivableForm derivable={definition} control={form.control} />

                        {credentialTemplate && (
                            <Form.Field control={form.control} name='credential_id' render={({ field, fieldState }) => (
                                <Form.Item>
                                    <Form.Label>
                                        Credential
                                        <span className='ml-1 text-destructive'>*</span>
                                    </Form.Label>
                                    <CredentialPicker
                                        credentialTemplate={credentialTemplate}
                                        instanceId={field.value}
                                        setInstance={field.onChange}
                                        issue={Boolean(fieldState.error)}
                                        showTitle={false}
                                    />
                                    <Form.Message />
                                </Form.Item>
                            )} />
                        )}

                    </form>
                </Form.Root>
            </ScrollArea.Root>

            {/* Footer */}
            <div className='pointer-events-none absolute bottom-0 left-0 right-0 pt-2 px-4 pb-4 mt-auto w-full flex'>
                <div className='ml-auto gap-2 flex'>
                    {live?.status === 'inactive' && (
                        <SocketButton action='connect' label='Connect' pendingAction={pendingAction} disabled={isBusy} onClick={runSocketAction} />
                    )}
                    {live?.status === 'failed' && (
                        <SocketButton action='reconnect' label='Reconnect' pendingAction={pendingAction} disabled={isBusy} onClick={runSocketAction} />
                    )}
                    {live && live.status !== 'inactive' && (
                        <SocketButton action='disconnect' label='Disconnect' pendingAction={pendingAction} disabled={isBusy} onClick={runSocketAction} />
                    )}
                    <Button type='submit' form={formId} className='pointer-events-auto rounded-full' disabled={isBusy}>
                        {form.formState.isSubmitting && <Spinner className='mr-2 h-4 w-4' />}
                        {connection ? 'Save' : 'Add'}
                    </Button>
                </div>
            </div>
        </>
    )
}

interface SocketButtonProps {
    action:        SocketAction
    label:         string
    pendingAction: SocketAction | null
    disabled:      boolean
    onClick:       (action: SocketAction) => void
}

const SocketButton = ({ action, label, pendingAction, disabled, onClick }: SocketButtonProps) => (
    <Button type='button' variant='ghost' className='pointer-events-auto rounded-full' disabled={disabled} onClick={() => onClick(action)}>
        {pendingAction === action && <Spinner className='mr-2 h-4 w-4' />}
        {label}
    </Button>
)
