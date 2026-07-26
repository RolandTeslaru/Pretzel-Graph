import { createFileRoute, Outlet } from '@tanstack/react-router'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { FileSystemTree } from '@/SDKs/LibrarySDK/ui/FileSystemTree'
import { ScrollArea } from '@pretzel-graph/standard-ui/foundations'

const BOOTSTRAP_STALE_TIME = 60_000

export const Route = createFileRoute('/home/projects')({
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
    component: ProjectsLayout,
})

function ProjectsLayout() {
    QuerySDK.useQuery(['library', 'bootstrap'], () => LibrarySDK.actions.bootstrap.get(), {
        staleTime: BOOTSTRAP_STALE_TIME,
    })

    QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: BOOTSTRAP_STALE_TIME },
    )


    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
            <ScrollArea.Root className="h-screen sticky top-0 left-0 pr-2 ">
                <FileSystemTree
                    className=" overflow-auto"
                />
            </ScrollArea.Root>

            <ScrollArea.Root className="h-screen">
                <Outlet />
            </ScrollArea.Root>
        </div>
    )
}
