import { useMemo, useState } from 'react'
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button, DropdownMenu, SearchInput } from '@pretzel-graph/standard-ui/foundations'
import { openCreateFolderDialog, openCreateWorkflowDialog } from '@/SDKs/LibrarySDK/ui/create-dialogs'
import type { Library } from '@pretzel-graph/shared/domain'
import Breadcrumbs from './-components/Breadcrumbs';
import FolderView from '@/SDKs/LibrarySDK/ui/FolderView'

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

    const navigate = useNavigate()

    const [folder, breadCrumbs, childFolders, workflows] = LibrarySDK.useStore(s => [
        s.folders[id],
        s.selectors.getBreadcrumbs(s, id),
        Object.values(s.folders).filter((f) => f.parent_folder_id === folderId),
        Object.values(s.workflowMetas).filter((w) => w.folder_id === folderId)
    ])

    const [search, setSearch] = useState('')

    const query = search.trim().toLowerCase()

    const filteredFolders = useMemo(() => childFolders.filter(f => matchesQuery(f, query)), [childFolders, query])

    const filteredWorkflows = useMemo(() => workflows.filter(w => matchesQuery(w, query)), [workflows, query])

    const isEmpty = childFolders.length === 0 && workflows.length === 0

    const hasNoMatches = !isEmpty && filteredFolders.length === 0 && filteredWorkflows.length === 0

    if (!folder) {
        return <div className="p-6 opacity-60">Folder not found.</div>
    }

    return (
        <>
            {/* Top Bar */}
            <div className="absolute top-0 pr-10 w-full flex items-center justify-between mb-4 z-10">
                <Breadcrumbs cwd={breadCrumbs} />
                <div className="flex items-center gap-2 pt-0.5">
                    <SearchInput
                        size='sm'
                        className='rounded-full!'
                        onSearch={setSearch}
                    />
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <Button>
                                Create
                            </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                            <DropdownMenu.Item
                                onClick={() => openCreateFolderDialog({ parent_folder_id: id })}
                            ><SystemIcons.Folder />Create Folder</DropdownMenu.Item>

                            <DropdownMenu.Item
                                onClick={() => openCreateWorkflowDialog({ folder_id: id })}
                            ><SystemIcons.Graph />Create Workflow</DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </div>
            </div>

            {hasNoMatches ?
             <NoMatches query={search.trim()} />
             :
            <FolderView
                childFolders={filteredFolders}
                workflows={filteredWorkflows}
                className='pt-12 pb-20 pr-10'
                onFolderClick={(folderId) => navigate({ to: '/home/projects/$folderId', params: { folderId } })}
                onWorkflowClick={(workflowid) => navigate({ to: '/workflow/$workflowid', params: { workflowid } })}
            />
            }
        </>
    )
}

function matchesQuery(item: { id: string, display_name: string }, query: string) {
    if (!query) return true

    return item.display_name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query)
}

function NoMatches({ query }: { query: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <SystemIcons.Search size={32} className="mb-3" />
            <p className="text-sm">No results for "{query}".</p>
        </div>
    )
}
