import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { DialogSDK } from '@/SDKs/DialogSDK/sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { AlertDialog, Button, DropdownMenu } from '@vx-agent-editor/vx-ui/foundations'
import { openCreateFolderDialog, openCreateWorkflowDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'
import type { Library } from '@vx-agent-editor/shared/domain'


export const Route = createFileRoute('/home/projects/$folderId')({
    loader: async ({ params }) => {
        const folderId = params.folderId as Library.Folder.Id

        const contents = await QuerySDK.client.fetchQuery({
            queryKey: ['folders', folderId, 'contents'],
            queryFn: () => LibrarySDK.actions.folder.getContents(folderId),
            staleTime: 60_000,
        })

        if (!contents?.folder) throw notFound()

        // Ensure the owning project is cached so the breadcrumb has a name.
        await QuerySDK.client.fetchQuery({
            queryKey: ['projects'],
            queryFn: () => LibrarySDK.actions.project.list(),
            staleTime: 60_000,
        })

        return null
    },
    component: FolderRoute,
})


function FolderRoute() {
    const { folderId } = Route.useParams()
    const id = folderId as Library.Folder.Id

    const folder = LibrarySDK.useStore((s) => s.folders[id])


    if (!folder) {
        return <div className="p-6 opacity-60">Folder not found.</div>
    }

    return (
        <div className="p-6 max-w-6xl">
            {/* <Breadcrumb project={project} folder={folder} projectRootFolderId={projectRootFolderId} /> */}
            <FolderView folderId={id}/>
        </div>
    )
}


function Breadcrumb({ folder, projectRootFolderId }: { folder: Library.Folder; projectRootFolderId: Library.Folder.Id | undefined }) {
    return (
        <nav className="flex items-center gap-1.5 text-sm mb-6">
            <Link
                to="/home/projects"
                className="opacity-60 hover:opacity-100 transition-opacity"
            >
                Projects
            </Link>
            <SystemIcons.ChevronRight size={14} className="opacity-40" />
            {folder.is_root ? (
                <span className="font-medium">{folder.display_name}</span>
            ) : (
                <>
                    <Link
                        to="/home/projects/$folderId"
                        params={{ folderId: projectRootFolderId! }}
                        disabled={!projectRootFolderId}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                        {folder.display_name}
                    </Link>
                    <SystemIcons.ChevronRight size={14} className="opacity-40" />
                    <span className="font-medium">{folder.display_name}</span>
                </>
            )}
        </nav>
    )
}


function FolderView({ folderId }: { folderId: Library.Folder.Id }) {

    const [childFolders, workflows] = LibrarySDK.useStore(s => [
        Object.values(s.folders).filter((f) => f.parent_folder_id === folderId),
        Object.values(s.workflowMetas).filter((w) => w.folder_id === folderId)
    ])

    const isEmpty = childFolders.length === 0 && workflows.length === 0

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm opacity-70">
                    <span>{childFolders.length} folder{childFolders.length === 1 ? '' : 's'}</span>
                    <span>·</span>
                    <span>{workflows.length} workflow{workflows.length === 1 ? '' : 's'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateFolderDialog({ parent_folder_id: folderId })}
                    >
                        <SystemIcons.Plus />
                        New folder
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateWorkflowDialog({ folder_id: folderId })}
                    >
                        <SystemIcons.Plus />
                        New workflow
                    </Button>
                </div>
            </div>

            {isEmpty ? (
                <EmptyFolder />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {childFolders.map((f) => <FolderCard key={f.id} folder={f} />)}
                    {workflows.map((w) => <WorkflowCard key={w.id} workflow={w} />)}
                </div>
            )}
        </>
    )
}


function FolderCard({ folder }: { folder: Library.Folder }) {
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


function WorkflowCard({ workflow }: { workflow: Library.WorkflowMeta }) {
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
                            onClick={() => openDeleteWorkflowDialog(workflow)}
                        >
                            <SystemIcons.Trash2 />
                            Delete workflow
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>

            <Link
                to="/workflow/$workflowid"
                params={{ workflowid: workflow.id }}
                className="block p-4 pr-11"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                        <SystemIcons.FileCode size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{workflow.display_name || 'Untitled'}</div>
                        {workflow.description && (
                            <p className="text-xs opacity-60 truncate mt-0.5">{workflow.description}</p>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    )
}

function openDeleteWorkflowDialog(workflow: Library.WorkflowMeta) {
    const dialogId = `delete-workflow-${workflow.id}`

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type="danger"
            onApprove={async () => {
                await LibrarySDK.actions.workflow.delete(workflow.id)
                DialogSDK.actions.pop(dialogId)
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <AlertDialog.Title>
                Delete workflow?
            </AlertDialog.Title>
            <AlertDialog.Description>
                This action is irreversible. Deleting <span className="font-semibold text-destructive">{workflow.display_name || 'Untitled'}</span> cannot be undone.
            </AlertDialog.Description>
        </DialogSDK.AlertTemplate>
    ))
}


function EmptyFolder() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <SystemIcons.FolderOpen size={32} className="mb-3" />
            <p className="text-sm">This folder is empty.</p>
        </div>
    )
}
