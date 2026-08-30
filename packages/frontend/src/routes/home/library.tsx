import { createFileRoute, Outlet, useNavigate, useParams } from '@tanstack/react-router'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { LibraryTree } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/LibraryTree'
import { ScrollArea, SearchInput } from '@pretzel-graph/standard-ui/foundations'
import type { Library } from '@pretzel-graph/shared/domain'
import { useState } from 'react'

const BOOTSTRAP_STALE_TIME = 60_000

export const Route = createFileRoute('/home/library')({
    loader: async () => {
        await Promise.all([
            QuerySDK.client.fetchQuery({
                queryKey: ['library', 'bootstrap'],
                queryFn: () => LibrarySDK.actions.bootstrap.get(),
                staleTime: BOOTSTRAP_STALE_TIME,
            }),
            QuerySDK.client.fetchQuery({
                queryKey: ['version-control', 'active-workflows'],
                queryFn: () => VersionControlSDK.actions.listActiveWorkflows(),
                staleTime: BOOTSTRAP_STALE_TIME,
            }),
        ])

        return null
    },
    component: LibraryLayout,
})

function LibraryLayout() {
    const navigate = useNavigate()
    const { folderId } = useParams({ strict: false })
    const cwd = folderId as Library.Folder.Id

    QuerySDK.useQuery(['library', 'bootstrap'], () => LibrarySDK.actions.bootstrap.get(), {
        staleTime: BOOTSTRAP_STALE_TIME,
    })

    QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: BOOTSTRAP_STALE_TIME },
    )

    const [treeSearchQuery, setTreeSearchQuery] = useState("");

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">

            {/* Search input cannot be underneath a mask because blur stops working >:( */}
            <div className='relative'>
                <div className="absolute z-10 top-[60px] w-full flex flex-row " >
                    <SearchInput 
                        className='rounded-full!'
                        wrapperClassName='flex-1 mx-1'
                        onSearch={(value) => setTreeSearchQuery(value.trim().toLowerCase())}
                    />
                </div>
                <LibraryTree
                    scrollContainerClassName="h-screen [mask-image:linear-gradient(to_bottom,transparent_8px,black_72px)]"
                    cwd={cwd}
                    className={"pt-[100px]"}
                    searchQuery={treeSearchQuery}
                    setCwd={(folderId) => navigate({ to: '/home/library/$folderId', params: { folderId } })}
                    onWorkflowClick={(workflowid) => navigate({ to: '/workflow/$workflowid', params: { workflowid } })}
                />
            </div>


            <Outlet />
        </div>
    )
}
