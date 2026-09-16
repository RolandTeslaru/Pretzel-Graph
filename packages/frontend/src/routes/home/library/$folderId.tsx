import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Library } from '@pretzel-graph/shared/domain'
import { LibraryBrowser } from '@/SDKs/LibrarySDK/ui/LibraryBrowser'
import { Skeleton } from '@pretzel-graph/standard-ui/foundations'

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
            <LibraryBrowser.View.Skeleton className='pt-[100px]' />
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
    const showHidden = LibrarySDK.useStore(s => s.showHidden)

    return (
        <div className='relative'>
            <LibraryBrowser.View.Header className='top-[60px] pr-10'>
                <LibraryBrowser.View.Breadcrumbs className="h-auto my-auto" />
                <div className="flex gap-2 ">
                    <LibraryBrowser.View.SearchInput
                        size='sm'
                        className='rounded-full!'
                    />
                    <LibraryBrowser.View.CreateBtn />
                </div>
            </LibraryBrowser.View.Header>
            <LibraryBrowser.View
                scrollContainerClassName='h-screen [mask-image:linear-gradient(to_bottom,transparent_8px,black_72px)]'
                className='pt-[100px]'
            />
        </div>
    )
}
