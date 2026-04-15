import { createFileRoute } from '@tanstack/react-router'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { Button } from '@vx-agent-editor/vx-ui/foundations'
import { openCreateProjectDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'
import { ProjectCard } from './-components/ProjectCard'


export const Route = createFileRoute('/home/projects/')({
    loader: async () => {
        await QuerySDK.client.fetchQuery({
            queryKey: ['library', 'bootstrap'],
            queryFn: () => LibrarySDK.actions.bootstrap.get(),
            staleTime: 60_000,
        })

        return null
    },
    component: ProjectsRoute,
})


function ProjectsRoute() {
    // The loader already kicked off the fetch; useQuery just subscribes + handles refetch.
    QuerySDK.useQuery(['library', 'bootstrap'], () => LibrarySDK.actions.bootstrap.get(), {
        staleTime: 60_000,
    })

    const projects = LibrarySDK.useStore((s) => 
        Object.values(s.folders).filter((f) => f.is_root).sort(
            (a, b) => b.created_at.localeCompare(a.created_at),
        )
    )

    return (
        <div className="p-6 max-w-6xl w-full">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Projects</h1>
                <Button variant="outline" size="sm" onClick={() => openCreateProjectDialog()}>
                    <SystemIcons.Plus />
                    New project
                </Button>
            </div>

            {projects.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
            )}
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <SystemIcons.Folder size={32} className="mb-3" />
            <p className="text-sm">You don't have any projects yet.</p>
            <p className="text-xs opacity-60 mt-1">Create one to start building workflows.</p>
        </div>
    )
}
