import type { ReactNode } from 'react'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AlertDialog, ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import { Library } from '@pretzel-graph/shared/domain'
import { openEditFolderDialog } from '@/SDKs/LibrarySDK/ui/create-dialogs'
import { openCreateFolderDialog } from '@/SDKs/LibrarySDK/ui/folder-dialogs'
import { openCreateWorkflowDialog } from '@/SDKs/LibrarySDK/ui/workflow-dialogs'
import { OpenInSubMenu } from './open-in'

interface Props {
    folder: Library.Folder
    onOpen?: () => void
    children: ReactNode
}

export function FolderContextMenu({ folder, onOpen, children }: Props) {
    const isRoot = folder.id === Library.Folder.ROOT_ID

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                {children}
            </ContextMenu.Trigger>
            <ContextMenu.Content>
                {onOpen && (
                    <ContextMenu.Item
                        icon={<SystemIcons.FolderOpen className='size-4' />}
                        onClick={onOpen}
                    >
                        Open here
                    </ContextMenu.Item>
                )}
                <OpenInSubMenu url={`/home/library/${folder.id}`} />
                <ContextMenu.Separator />
                <ContextMenu.Sub>
                    <ContextMenu.SubTrigger icon={<SystemIcons.Plus className='size-4' />}>
                        New
                    </ContextMenu.SubTrigger>
                    <ContextMenu.SubContent>
                        <ContextMenu.Item
                            icon={<SystemIcons.Folder className='size-4' />}
                            onClick={() => openCreateFolderDialog({ parent_folder_id: folder.id })}
                        >
                            Folder
                        </ContextMenu.Item>
                        <ContextMenu.Item
                            icon={<SystemIcons.Graph className='size-4' />}
                            onClick={() => openCreateWorkflowDialog({ folder_id: folder.id })}
                        >
                            Workflow
                        </ContextMenu.Item>
                    </ContextMenu.SubContent>
                </ContextMenu.Sub>
                <ContextMenu.Separator />
                <ContextMenu.Item
                    icon={<SystemIcons.SquarePen className='size-4' />}
                    onClick={() => openEditFolderDialog({ folder })}
                >
                    Edit
                </ContextMenu.Item>
                <ContextMenu.Item
                    icon={<SystemIcons.Copy className='size-4' />}
                    onClick={() => navigator.clipboard.writeText(folder.id)}
                >
                    Copy ID
                </ContextMenu.Item>
                {!isRoot && (
                    <ContextMenu.Item
                        icon={folder.hidden ? <SystemIcons.Eye className='size-4' /> : <SystemIcons.EyeOff className='size-4' />}
                        onClick={() => LibrarySDK.actions.folder.setHidden(folder.id, !folder.hidden)}
                    >
                        {folder.hidden ? 'Unhide' : 'Hide'}
                    </ContextMenu.Item>
                )}
                {!isRoot && (
                    <>
                        <ContextMenu.Separator />
                        <ContextMenu.Item
                            variant='destructive'
                            icon={<SystemIcons.Trash2 className='size-4' />}
                            onClick={() => openDeleteFolderDialog(folder)}
                        >
                            Delete
                        </ContextMenu.Item>
                    </>
                )}
            </ContextMenu.Content>
        </ContextMenu.Root>
    )
}

export function openDeleteFolderDialog(folder: Library.Folder) {
    const dialogId = `delete-folder-${folder.id}`

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type='danger'
            onApprove={async () => {
                await LibrarySDK.actions.folder.delete(folder.id)
                DialogSDK.actions.pop(dialogId)
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <AlertDialog.Title>
                Delete folder?
            </AlertDialog.Title>
            <AlertDialog.Description>
                This action is irreversible. Deleting <span className='font-semibold text-destructive'>{folder.display_name}</span> will also delete all nested folders and workflows inside it.
            </AlertDialog.Description>
        </DialogSDK.AlertTemplate>
    ))
}
