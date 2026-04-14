import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { Button } from '@vx-agent-editor/vx-ui/foundations'
import { openCreateFolderDialog, openCreateWorkflowDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'
import { useShallow } from 'zustand/react/shallow'
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
    const project = LibrarySDK.useStore((s) =>
        folder ? s.projects[folder.project_id] : undefined,
    )
    const projectRootFolderId = LibrarySDK.useStore((s) =>
        folder ? s.rootFolderByProject[folder.project_id] : undefined,
    )

    if (!folder || !project) {
        return <div className="p-6 opacity-60">Folder not found.</div>
    }

    return (
        <div className="p-6 max-w-6xl">
            <Breadcrumb project={project} folder={folder} projectRootFolderId={projectRootFolderId} />
            <FolderView folderId={id} projectId={folder.project_id} />
        </div>
    )
}


function Breadcrumb({ project, folder, projectRootFolderId }: { project: Library.Project; folder: Library.Folder; projectRootFolderId: Library.Folder.Id | undefined }) {
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
                <span className="font-medium">{project.display_name}</span>
            ) : (
                <>
                    <Link
                        to="/home/projects/$folderId"
                        params={{ folderId: projectRootFolderId! }}
                        disabled={!projectRootFolderId}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                        {project.display_name}
                    </Link>
                    <SystemIcons.ChevronRight size={14} className="opacity-40" />
                    <span className="font-medium">{folder.display_name}</span>
                </>
            )}
        </nav>
    )
}


function FolderView({ folderId, projectId }: { folderId: Library.Folder.Id; projectId: Library.Project.Id }) {
    const childFolders = LibrarySDK.useStore(
        useShallow((s) => Object.values(s.folders).filter((f) => f.parent_folder_id === folderId)),
    )
    const workflows = LibrarySDK.useStore(
        useShallow((s) => Object.values(s.workflowMetas).filter((w) => w.folder_id === folderId)),
    )

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
                        onClick={() => openCreateFolderDialog({ project_id: projectId, parent_folder_id: folderId })}
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
        <Link
            to="/home/projects/$folderId"
            params={{ folderId: folder.id }}
            className="block p-4 rounded-xl border hover:bg-muted/40 transition-colors"
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
    )
}


function WorkflowCard({ workflow }: { workflow: Library.WorkflowMeta }) {
    return (
        <Link
            to="/workflow/$workflowid"
            params={{ workflowid: workflow.id }}
            className="block p-4 rounded-xl border hover:bg-muted/40 transition-colors"
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
    )
}


function EmptyFolder() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <SystemIcons.FolderOpen size={32} className="mb-3" />
            <p className="text-sm">This folder is empty.</p>
        </div>
    )
}
