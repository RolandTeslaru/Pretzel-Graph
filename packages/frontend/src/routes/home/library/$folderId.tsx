import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Library } from '@pretzel-graph/shared/domain'
import { FolderBrowser } from './-components/FolderBrowser'

export const Route = createFileRoute('/home/library/$folderId')({
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
                <Link to="/home/library" className="mt-5 text-sm underline underline-offset-4 hover:opacity-80">
                    Back to Library
                </Link>
            </div>
        </div>
    )
}


function FolderRoute() {
    const { folderId } = Route.useParams()
    const id = folderId as Library.Folder.Id

    const folder = LibrarySDK.useStore(s => s.folders[id])

    if (!folder) {
        return <div className="p-6 opacity-60">Folder not found.</div>
    }

    return <FolderBrowser folderId={id} />
}
