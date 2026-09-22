import { toast } from 'sonner'
import type { Gateway, Library } from '@pretzel-graph/shared/domain'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { AlertDialog } from '@pretzel-graph/standard-ui/foundations'
import { GatewaySDK } from '@/SDKs/GatewaySDK/sdk'
import { ConnectionFormDialog } from '@/SDKs/GatewaySDK/ui/ConnectionForm'

export function openCreateConnectionDialog(args: { folder_id: Library.Folder.Id; definition: Gateway.Definition }) {
    const dialogId = `create-connection-${args.definition.id}-${args.folder_id}`

    DialogSDK.actions.push(dialogId, (props) => (
        <ConnectionFormDialog
            {...props}
            definition={args.definition}
            folderId={args.folder_id}
            onCreated={() => DialogSDK.actions.pop(dialogId)}
        />
    ))
}

export function openEditConnectionDialog(args: { connection: Gateway.Connection }) {
    const definition = GatewaySDK.state.definitions[args.connection.definitionId]

    if (!definition) {
        toast.error('This connection type is no longer available')
        return
    }

    const dialogId = `edit-connection-${args.connection.id}`

    DialogSDK.actions.push(dialogId, (props) => (
        <ConnectionFormDialog
            {...props}
            definition={definition}
            folderId={args.connection.folderId}
            connection={args.connection}
            onUpdated={() => DialogSDK.actions.pop(dialogId)}
        />
    ))
}

export function openDeleteConnectionDialog(args: { connection: Gateway.Connection }) {
    const dialogId = `delete-connection-${args.connection.id}`

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type='danger'
            onApprove={async () => {
                try {
                    await GatewaySDK.actions.connection.remove(args.connection.id)
                } catch {
                    // SDK already toasted
                }

                DialogSDK.actions.pop(dialogId)
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <AlertDialog.Title>
                Delete connection?
            </AlertDialog.Title>
            <AlertDialog.Description>
                Deleting <span className='font-semibold text-destructive'>{args.connection.name}</span> closes its connection and cannot be undone. Workflows listening to it stop receiving events.
            </AlertDialog.Description>
        </DialogSDK.AlertTemplate>
    ))
}
