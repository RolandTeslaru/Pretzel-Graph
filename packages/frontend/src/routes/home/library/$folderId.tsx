import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Library } from '@pretzel-graph/shared/domain'
import { FolderView, FolderViewSkeleton } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/FolderView'
import { Skeleton } from '@pretzel-graph/standard-ui/foundations'
import { useOpenLibraryItem } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/use-open-item'

export const Route = createFileRoute('/home/library/$folderId')({
    loader: async ({ params }) => {
        const folderId = params.folderId as Library.Folder.Id

        await LibrarySDK.fetch(LibrarySDK.query.bootstrap)

        const hasFolder = folderId in LibrarySDK.state.folders
        if (!hasFolder) throw notFound()

        return null
    },
    pendingComponent: FolderPending,
    notFoundComponent: FolderNotFound,
    component: FolderRoute,
    pendingMs: 0
})


function FolderPending() {
    return (
        <div className='relative'>
            <div className='absolute z-10 top-[60px] flex justify-between w-full pr-10 items-center gap-2'>
                <Skeleton className='h-4 w-40' />
                <div className='flex gap-2'>
                    <Skeleton className='h-8 w-48 rounded-full' />
                    <Skeleton className='h-9 w-20' />
                </div>
            </div>
            <FolderViewSkeleton className='pt-[100px]' />
        </div>
    )
}


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
    const navigate = useNavigate()
    const openItem = useOpenLibraryItem()
    const { folderId: _folderId } = Route.useParams()
    const folderId = _folderId as Library.Folder.Id

    const showHidden = LibrarySDK.useStore(s => s.showHidden)

    const setCwd = (folderId: Library.Folder.Id) => navigate({ to: '/home/library/$folderId', params: { folderId } })

    return (
        <FolderView.Root cwd={folderId} setCwd={setCwd}>
            <FolderView.Header className='top-[60px] pr-10'>
                <FolderView.Breadcrumbs className="h-auto my-auto" />
                <div className="flex gap-2 ">
                    <FolderView.SearchInput
                        size='sm'
                        className='rounded-full!'
                    />
                    <FolderView.CreateBtn />
                </div>
            </FolderView.Header>
            <FolderView.Content
                scrollContainerClassName='h-screen [mask-image:linear-gradient(to_bottom,transparent_8px,black_72px)]'
                className='pt-[100px]'
                onItemClick={openItem}
            />
        </FolderView.Root>
    )
}
