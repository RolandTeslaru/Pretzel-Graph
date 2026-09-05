import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Library } from '@pretzel-graph/shared/domain'
import { FolderView } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/FolderView'
import { useState } from 'react'
import { Button, DropdownMenu, SearchInput, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { LibraryCwdBreadcrumbs } from '@/SDKs/LibrarySDK/ui/LibraryCwdBreadcrumbs'

const BOOTSTRAP_STALE_TIME = 60_000

export const Route = createFileRoute('/home/library/$folderId')({
    loader: async ({ params }) => {
        const folderId = params.folderId as Library.Folder.Id

        // The check below reads store state, so the fetch has to settle first.
        await QuerySDK.client.fetchQuery({
            queryKey: ['library', 'bootstrap'],
            queryFn: () => LibrarySDK.actions.bootstrap.get(),
            staleTime: BOOTSTRAP_STALE_TIME,
        })

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
    const navigate = useNavigate()
    const { folderId: _folderId } = Route.useParams()
    const folderId = _folderId as Library.Folder.Id

    const [folder, breadCrumbs] = LibrarySDK.useStore(s => [s.folders[folderId], s.selectors.getBreadcrumbs(s, folderId)])
    const showHidden = LibrarySDK.useStore(s => s.showHidden)

    if (!folder) {
        return <div className="p-6 opacity-60">Folder not found.</div>
    }

    const [searchQuery, setSearchQuery] = useState("");

    const setCwd = (folderId: Library.Folder.Id) => navigate({ to: '/home/library/$folderId', params: { folderId } })

    return (
        <div className='relative'>
            <div className='absolute z-10 top-[60px] flex justify-between w-full pr-10 items-center gap-2'>
                <LibraryCwdBreadcrumbs cwd={folder.id} className="h-auto my-auto" setCwd={setCwd} />
                <div className="flex gap-2 ">
                    <SearchInput
                        size='sm'
                        className='rounded-full!'
                        onSearch={setSearchQuery}
                    />

                    <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                aria-pressed={showHidden}
                                onClick={() => LibrarySDK.actions.preferences.setShowHidden(!showHidden)}
                            >
                                {showHidden ? <SystemIcons.Eye /> : <SystemIcons.EyeOff />}
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            {showHidden ? 'Hide hidden items' : 'Show hidden items'}
                        </Tooltip.Content>
                    </Tooltip.Root>

                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <Button>
                                Create
                            </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                            <DropdownMenu.Item
                                onClick={() => LibrarySDK.openCreateFolderDialog({ parent_folder_id: folderId })}
                            ><SystemIcons.Folder />Create Folder</DropdownMenu.Item>

                            <DropdownMenu.Item
                                onClick={() => LibrarySDK.openCreateWorkflowDialog({ folder_id: folderId })}
                            ><SystemIcons.Graph />Create Workflow</DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </div>
            </div>
            <FolderView
                cwd={folderId}
                scrollContainerClassName='h-screen [mask-image:linear-gradient(to_bottom,transparent_8px,black_72px)]'
                className='pt-[100px]'
                setCwd={(folderId) => navigate({ to: '/home/library/$folderId', params: { folderId } })}
                onWorkflowClick={(workflowid) => navigate({ to: '/workflow/$workflowid', params: { workflowid } })}
                searchQuery={searchQuery}
            />
        </div>
    )
}
