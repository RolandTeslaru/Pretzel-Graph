import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AlertDialog, ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import type { Library } from '@pretzel-graph/shared/domain'
import { openEditFolderDialog } from '@/SDKs/LibrarySDK/ui/create-dialogs'
import { FolderIcon } from './FolderIcon'

interface FolderCardProps {
    folder: Library.Folder
}

export function FolderCard({ folder }: FolderCardProps) {
    const itemCount = LibrarySDK.useStore((s) =>
        Object.values(s.folders).filter((f) => f.parent_folder_id === folder.id).length +
        Object.values(s.workflowMetas).filter((w) => w.folder_id === folder.id).length,
    )

    return (
        <FolderCardContextMenu folder={folder}>
            <Link
                to="/home/projects/$folderId"
                params={{ folderId: folder.id }}
                className="p-4 flex flex-col gap-1 hover:bg-accent/30 rounded-md relative m-auto"
            >
                <FolderIcon color="var(--primary)" className="size-20 shrink-0 mx-auto" />
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-center truncate">{folder.display_name}</p>
                    <div className="text-xs opacity-50 mt-2 flex items-center justify-center gap-3">
                        <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                    </div>
                </div>
            </Link>
        </FolderCardContextMenu>
    )
}

interface FolderCardContextMenuProps {
    folder: Library.Folder
    children: ReactNode
}

function FolderCardContextMenu({ folder, children }: FolderCardContextMenuProps) {
    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                {children}
            </ContextMenu.Trigger>
            <ContextMenu.Content>
                <ContextMenu.Item
                    icon={<SystemIcons.SquarePen className="size-4" />}
                    onClick={() => openEditFolderDialog({ folder })}
                >
                    Edit
                </ContextMenu.Item>
                <ContextMenu.Item
                    icon={<SystemIcons.Copy className="size-4" />}
                    onClick={() => navigator.clipboard.writeText(folder.id)}
                >
                    Copy ID
                </ContextMenu.Item>
                <ContextMenu.Separator />
                <ContextMenu.Item
                    variant="destructive"
                    icon={<SystemIcons.Trash2 className="size-4" />}
                    onClick={() => openDeleteFolderDialog(folder)}
                >
                    Delete
                </ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Root>
    )
}

export function openDeleteFolderDialog(folder: Library.Folder) {
    const dialogId = `delete-folder-${folder.id}`

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type="danger"
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
                This action is irreversible. Deleting <span className="font-semibold text-destructive">{folder.display_name}</span> will also delete all nested folders and workflows inside it.
            </AlertDialog.Description>
        </DialogSDK.AlertTemplate>
    ))
}
