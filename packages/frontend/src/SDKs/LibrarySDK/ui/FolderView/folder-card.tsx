import type { ReactNode } from 'react'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AlertDialog, ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import type { Library } from '@pretzel-graph/shared/domain'
import { openEditFolderDialog } from '@/SDKs/LibrarySDK/ui/create-dialogs'
import { FolderIllustration } from '@pretzel-graph/standard-ui/icons/illustrations'
import type { FolderViewSize } from './size'
import classNames from 'classnames'

interface FolderCardProps {
    folder: Library.Folder
    size?: FolderViewSize
    onClick?: () => void
}

const sizeStyles = {
    default: {
        card: 'p-4',
        icon: 'size-20',
        name: 'text-sm',
        meta: 'text-xs mt-2',
    },
    sm: {
        card: 'p-2',
        icon: 'size-12',
        name: 'text-xs',
        meta: 'text-[10px] mt-1',
    },
} as const

export function FolderCard({ folder, size = 'default', onClick }: FolderCardProps) {
    const itemCount = LibrarySDK.useStore((s) =>
        Object.values(s.folders).filter((f) => f.parent_folder_id === folder.id).length +
        Object.values(s.workflowMetas).filter((w) => w.folder_id === folder.id).length,
    )

    const styles = sizeStyles[size]

    return (
        <FolderCardContextMenu folder={folder}>
            <div
                onClick={onClick}
                className={classNames('flex flex-col gap-1 hover:bg-accent/30 rounded-md relative m-auto cursor-pointer select-none', styles.card)}
            >
                <FolderIllustration color="var(--primary)" className={classNames('shrink-0 mx-auto', styles.icon)} />
                <div className="min-w-0 flex-1">
                    <p className={classNames('font-medium text-center truncate', styles.name)}>{folder.display_name}</p>
                    <div className={classNames('opacity-50 flex items-center justify-center gap-3', styles.meta)}>
                        <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                    </div>
                </div>
            </div>
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
