import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Library } from '@pretzel-graph/shared/domain'
import { FolderView, FolderViewSkeleton } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/FolderView'
import { useState } from 'react'
import { Button, DropdownMenu, SearchInput, Skeleton, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { LibraryCwdBreadcrumbs } from '@/SDKs/LibrarySDK/ui/LibraryCwdBreadcrumbs'
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

    const [searchQuery, setSearchQuery] = useState("");

    const showHidden = LibrarySDK.useStore(s => s.showHidden)

    const setCwd = (folderId: Library.Folder.Id) => navigate({ to: '/home/library/$folderId', params: { folderId } })

    return (
        <div className='relative'>
            <div className='absolute z-10 top-[60px] flex justify-between w-full pr-10 items-center gap-2'>
                <LibraryCwdBreadcrumbs cwd={folderId} className="h-auto my-auto" setCwd={setCwd} />
                <div className="flex gap-2 ">
                    {/* <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                            <Button
                                variant="input"
                                size="icon-sm"
                                aria-pressed={showHidden}
                                onClick={() => LibrarySDK.actions.preferences.setShowHidden(!showHidden)}
                            >
                                {showHidden ? <SystemIcons.Eye className='size-4' /> : <SystemIcons.EyeOff className='size-4' />}
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            {showHidden ? 'Hide hidden items' : 'Show hidden items'}
                        </Tooltip.Content>
                    </Tooltip.Root> */}
                    <SearchInput
                        size='sm'
                        className='rounded-full!'
                        onSearch={setSearchQuery}
                    />


                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <Button>
                                Create
                            </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                            <DropdownMenu.Item
                                onClick={() => LibrarySDK.dialogs.openCreateFolder({ parent_folder_id: folderId })}
                            ><SystemIcons.Folder />Create Folder</DropdownMenu.Item>

                            <DropdownMenu.Item
                                onClick={() => LibrarySDK.dialogs.openCreateWorkflow({ folder_id: folderId })}
                            ><SystemIcons.Graph />Create Workflow</DropdownMenu.Item>

                            <DropdownMenu.Item
                                onClick={() => LibrarySDK.dialogs.openCreateSkill({ folder_id: folderId })}
                            ><SystemIcons.Sparkles2 />Create Skill</DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </div>
            </div>
            <FolderView
                cwd={folderId}
                scrollContainerClassName='h-screen [mask-image:linear-gradient(to_bottom,transparent_8px,black_72px)]'
                className='pt-[100px]'
                setCwd={(folderId) => navigate({ to: '/home/library/$folderId', params: { folderId } })}
                onItemClick={openItem}
                searchQuery={searchQuery}
            />
        </div>
    )
}
