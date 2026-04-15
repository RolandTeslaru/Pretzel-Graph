import { createFileRoute, notFound } from '@tanstack/react-router'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { Button } from '@vx-agent-editor/vx-ui/foundations'
import { openCreateFolderDialog, openCreateWorkflowDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'
import { FolderCard } from './-components/FolderCard'
import { WorkflowCard } from './-components/WorkflowCard'
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
function EmptyFolder() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <SystemIcons.FolderOpen size={32} className="mb-3" />
            <p className="text-sm">This folder is empty.</p>
        </div>
    )
}
