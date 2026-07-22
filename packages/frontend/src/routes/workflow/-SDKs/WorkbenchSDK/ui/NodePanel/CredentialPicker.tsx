import { memo, useEffect } from 'react'
import { Select } from '@pretzel-graph/standard-ui/foundations/select'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { VaultSDK } from '@/SDKs/VaultSDK/sdk'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { WorkbenchSDK } from '../../sdk'
import { AddCredentialDialog } from './AddCredentialDialog'
import type { Vault, Workflow } from '@pretzel-graph/shared/domain'

interface Props {
    credentialTemplate: Vault.Credential.Template
    nodeId: Workflow.Node.Id
}

export const CredentialPicker = memo(({ credentialTemplate, nodeId }: Props) => {
    const instances = VaultSDK.useStore(s =>
        s.selectors.byTemplateId(s, credentialTemplate.id)
    )
    const [instanceId, setInstance, issue] = WorkbenchSDK.useCredential(nodeId, credentialTemplate.id)

    useEffect(() => {
        if (instances.length === 0) {
            VaultSDK.actions.refreshAll().catch(() => {})
        }
    }, [])

    const openAddDialog = () => {
        const dialogId = `add-credentialTemplate-${credentialTemplate.id}`
        DialogSDK.actions.push(dialogId, props => (
            <DialogSDK.Template {...props}>
                <AddCredentialDialog
                    credentialTemplate={credentialTemplate}
                    dialogId={dialogId}
                    onCreated={instanceId => setInstance(instanceId)}
                />
            </DialogSDK.Template>
        ))
    }

    return (
        <div className='flex flex-col gap-1 w-full'>
            <span className='text-xs font-medium text-muted-foreground'>{credentialTemplate.displayName}</span>
            <div className='flex gap-1.5'>
                <Select.Root
                    value={instanceId ?? ''}
                    onValueChange={val => setInstance(val as Vault.Credential.Instance.Id)}
                >
                    <Select.Trigger className={`flex-1 text-xs h-8${issue ? ' border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50' : ''}`}>
                        <Select.Value placeholder='Select credential…' />
                    </Select.Trigger>
                    <Select.Content>
                        {instances.length === 0 ? (
                            <div className='px-2 py-1.5 text-xs text-muted-foreground'>No credentials yet</div>
                        ) : (
                            instances.map(c => (
                                <Select.Item key={c.id} value={c.id} className='text-xs'>
                                    {c.name}
                                </Select.Item>
                            ))
                        )}
                    </Select.Content>
                </Select.Root>
                <Button
                    variant='outline'
                    size='sm'
                    className='px-2 text-xs'
                    onClick={openAddDialog}
                >
                    + Add
                </Button>
            </div>
        </div>
    )
})

CredentialPicker.displayName = 'CredentialPicker'
