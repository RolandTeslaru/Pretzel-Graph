import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button, DropdownMenu, SearchInput, Tabs } from '@pretzel-graph/standard-ui/foundations'
import { openCreateFolderDialog, openCreateWorkflowDialog } from '@/SDKs/LibrarySDK/ui/create-dialogs'
import type { Library } from '@pretzel-graph/shared/domain'
import Breadcrumbs from './Breadcrumbs'
import FolderView from '@/SDKs/LibrarySDK/ui/FolderView'

interface Props {
    folderId: Library.Folder.Id
}

export function FolderBrowser({ folderId }: Props) {
    const navigate = useNavigate()

    const [breadCrumbs, childFolders, workflows] = LibrarySDK.useStore(s => [
        s.selectors.getBreadcrumbs(s, folderId),
        Object.values(s.folders).filter((f) => f.parent_folder_id === folderId),
        Object.values(s.workflowMetas).filter((w) => w.folder_id === folderId)
    ])

    const [search, setSearch] = useState('')

    const query = search.trim().toLowerCase()

    const filteredFolders = useMemo(() => childFolders.filter(f => matchesQuery(f, query)), [childFolders, query])

    const filteredWorkflows = useMemo(() => workflows.filter(w => matchesQuery(w, query)), [workflows, query])

    const isEmpty = childFolders.length === 0 && workflows.length === 0

    const hasNoMatches = !isEmpty && filteredFolders.length === 0 && filteredWorkflows.length === 0

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
                                onClick={() => openCreateFolderDialog({ parent_folder_id: folderId })}
                            ><SystemIcons.Folder />Create Folder</DropdownMenu.Item>

                            <DropdownMenu.Item
                                onClick={() => openCreateWorkflowDialog({ folder_id: folderId })}
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
                onFolderClick={(folderId) => navigate({ to: '/home/library/$folderId', params: { folderId } })}
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
