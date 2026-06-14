import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { DialogSDK } from '@/SDKs/DialogSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { AlertDialog, ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import type { Library } from '@pretzel-graph/shared/domain'
import { openEditProjectDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'
import { FolderIcon } from './FolderIcon'

interface ProjectCardProps {
    project: Library.Folder
}

export function ProjectCard({ project }: ProjectCardProps) {
    const itemCount = LibrarySDK.useStore((s) =>
        Object.values(s.folders).filter((f) => f.parent_folder_id === project.id).length +
        Object.values(s.workflowMetas).filter((w) => w.folder_id === project.id).length,
    )

    return (
        <ProjectCardContextMenu project={project}>
            <Link
                to="/home/projects/$folderId"
                params={{ folderId: project.id }}
                disabled={!project.id}
                className="p-4 flex flex-col gap-1 hover:bg-accent/30 rounded-md relative m-auto aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
                <FolderIcon color="var(--primary)" className="size-20 shrink-0 mx-auto" />
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-center truncate">{project.display_name}</p>
                    <div className="text-xs opacity-50 mt-2 flex items-center justify-center gap-3">
                        <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                    </div>
                </div>
            </Link>
        </ProjectCardContextMenu>
    )
}

interface ProjectCardContextMenuProps {
    project: Library.Folder
    children: ReactNode
}

function ProjectCardContextMenu({ project, children }: ProjectCardContextMenuProps) {
    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                {children}
            </ContextMenu.Trigger>
            <ContextMenu.Content>
                <ContextMenu.Item
                    icon={<SystemIcons.SquarePen className='size-4' />}
                    onClick={() => openEditProjectDialog({ project })}
                >
                    Edit
                </ContextMenu.Item>
                <ContextMenu.Item
                    icon={<SystemIcons.Copy className='size-4' />}
                    onClick={() => navigator.clipboard.writeText(project.id)}
                >
                    Copy ID
                </ContextMenu.Item>
                <ContextMenu.Separator />
                <ContextMenu.Item
                    variant='destructive'
                    icon={<SystemIcons.Trash2 className='size-4' />}
                    onClick={() => openDeleteProjectDialog(project)}
                >
                    Delete
                </ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Root>
    )
}

export function openDeleteProjectDialog(project: Library.Folder) {
    const dialogId = `delete-project-${project.id}`

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type="danger"
            onApprove={async () => {
                await LibrarySDK.actions.folder.delete(project.id)
                DialogSDK.actions.pop(dialogId)
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <AlertDialog.Title>
                Delete project?
            </AlertDialog.Title>
            <AlertDialog.Description>
                This action is irreversible. Deleting <span className="font-semibold text-destructive">{project.display_name}</span> will also delete all folders and workflows inside it.
            </AlertDialog.Description>
        </DialogSDK.AlertTemplate>
    ))
}
