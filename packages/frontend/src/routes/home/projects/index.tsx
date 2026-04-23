import { createFileRoute } from '@tanstack/react-router'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { openCreateProjectDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'
import { ProjectCard } from './-components/ProjectCard'
import Breadcrumbs from './-components/Breadcrumbs'


export const Route = createFileRoute('/home/projects/')({
    component: ProjectsRoute,
})


function ProjectsRoute() {
    const projects = LibrarySDK.useStore((s) => 
        Object.values(s.folders).filter((f) => f.is_root).sort(
            (a, b) => b.created_at.localeCompare(a.created_at),
        )
    )

    return (
        <div>
            <Breadcrumbs
                cwd={[{ key: '', name: 'Projects' }]}
                className="mb-4"
            />
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
