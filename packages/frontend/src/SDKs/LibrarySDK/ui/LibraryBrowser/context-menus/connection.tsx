import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { GatewaySDK } from '@/SDKs/GatewaySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import type { Gateway } from '@pretzel-graph/shared/domain'
import { toast } from 'sonner'

interface Props {
    connection: Gateway.Connection
}

export function ConnectionMenuItems({ connection }: Props) {
    return (
        <>
            <ContextMenu.Item
                icon={<SystemIcons.GatewayConnection className='size-4' />}
                onClick={() => LibrarySDK.dialogs.openEditConnection({ connection })}
            >
                Open
            </ContextMenu.Item>
            <ContextMenu.Item
                icon={<SystemIcons.ArrowRight className='size-4' />}
                onClick={() => openMoveConnection(connection)}
            >
                Move to…
            </ContextMenu.Item>
            <ContextMenu.Item
                icon={<SystemIcons.Copy className='size-4' />}
                onClick={() => copy(connection.id, 'Connection id copied')}
            >
                Copy ID
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item
                variant='destructive'
                icon={<SystemIcons.Trash2 className='size-4' />}
                onClick={() => LibrarySDK.dialogs.openDeleteConnection({ connection })}
            >
                Delete
            </ContextMenu.Item>
        </>
    )
}

function openMoveConnection(connection: Gateway.Connection) {
    LibrarySDK.dialogs.openLibrarySelector({
        accept: 'folder',
        onSelect: async ({ id }) => {
            if (id === connection.folderId) return

            await GatewaySDK.actions.connection.update({ id: connection.id, folder_id: id })
            toast.success('Connection moved')
        },
    })
}

async function copy(text: string, message: string) {
    await navigator.clipboard.writeText(text)
    toast.success(message)
}
