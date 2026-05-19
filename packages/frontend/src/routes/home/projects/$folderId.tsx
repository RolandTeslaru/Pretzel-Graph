import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { openCreateFolderDialog, openCreateWorkflowDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'
import { FolderCard } from './-components/FolderCard'
import { WorkflowCard } from './-components/WorkflowCard'
import type { Library } from '@pretzel-graph/shared/domain'
import Breadcrumbs from './-components/Breadcrumbs'

export const Route = createFileRoute('/home/projects/$folderId')({
    loader: async ({ params }) => {
        const folderId = params.folderId as Library.Folder.Id

        const folders = LibrarySDK.state.folders;

        const hasFolder = folderId in folders;
        if (!hasFolder) throw notFound()

        return null
    },
    notFoundComponent: FolderNotFound,
    component: FolderRoute,
})


function FolderNotFound() {
    return (
        <div className="p-6 max-w-6xl">
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-80">
                <SystemIcons.FolderOpen size={34} className="mb-3" />
                <p className="text-base font-medium">Folder not found</p>
                <p className="text-sm opacity-70 mt-1">This folder may have been deleted or the link is invalid.</p>
                <Link to="/home/projects" className="mt-5 text-sm underline underline-offset-4 hover:opacity-80">
                    Back to Projects
                </Link>
            </div>
        </div>
    )
}


function FolderRoute() {
    const { folderId } = Route.useParams()
    const id = folderId as Library.Folder.Id

    const folder = LibrarySDK.useStore((s) => s.folders[id])


    if (!folder) {
        return <div className="p-6 opacity-60">Folder not found.</div>
    }

    return (
        <FolderView folderId={id}/>
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
                        <SystemIcons.Folder />
                        New folder
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateWorkflowDialog({ folder_id: folderId })}
                    >
                        <SystemIcons.Graph />
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
function EmptyFolder() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <SystemIcons.FolderOpen size={32} className="mb-3" />
            <p className="text-sm">This folder is empty.</p>
        </div>
    )
}
