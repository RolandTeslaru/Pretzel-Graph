import { Link } from '@tanstack/react-router'
import { DialogSDK } from '@/SDKs/DialogSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { AlertDialog, Button, DropdownMenu } from '@vx-agent-editor/vx-ui/foundations'
import type { Library } from '@vx-agent-editor/shared/domain'

interface FolderCardProps {
    folder: Library.Folder
}

export function FolderCard({ folder }: FolderCardProps) {
    return (
        <div className="relative rounded-xl border hover:bg-muted/40 transition-colors">
            <div className="absolute top-2 right-2 z-10">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" size="icon-xs" className="p-0!">
                            <SystemIcons.Ellipsis />
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                        <DropdownMenu.Item
                            variant="destructive"
                            onClick={() => openDeleteFolderDialog(folder)}
                        >
                            <SystemIcons.Trash2 />
                            Delete folder
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>

            <Link
                to="/home/projects/$folderId"
                params={{ folderId: folder.id }}
                className="block p-4 pr-11"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                        <SystemIcons.Folder size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{folder.display_name}</div>
                        {folder.description && (
                            <p className="text-xs opacity-60 truncate mt-0.5">{folder.description}</p>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    )
}

function openDeleteFolderDialog(folder: Library.Folder) {
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
