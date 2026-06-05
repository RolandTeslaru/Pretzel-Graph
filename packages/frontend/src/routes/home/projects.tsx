import { createFileRoute, Outlet } from '@tanstack/react-router'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { FileSystemTree } from '@/SDKs/LibrarySDK/ui/FileSystemTree'

const BOOTSTRAP_STALE_TIME = 60_000

export const Route = createFileRoute('/home/projects')({
    loader: async () => {
        await QuerySDK.client.fetchQuery({
            queryKey: ['library', 'bootstrap'],
            queryFn: () => LibrarySDK.actions.bootstrap.get(),
            staleTime: BOOTSTRAP_STALE_TIME,
        })

        return null
    },
    component: ProjectsLayout,
})

function ProjectsLayout() {
    QuerySDK.useQuery(['library', 'bootstrap'], () => LibrarySDK.actions.bootstrap.get(), {
        staleTime: BOOTSTRAP_STALE_TIME,
    })


    return (
        <div className="py-6 max-w-6xl w-full h-full">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
                <aside className="h-fit sticky">
                    <FileSystemTree
                        className=" overflow-auto"
                    />
                </aside>

                <div>
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
