import { createFileRoute, Link } from '@tanstack/react-router'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { Button } from '@vx-agent-editor/vx-ui/foundations'
import { openCreateProjectDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'
import { useShallow } from 'zustand/react/shallow'
import type { Library } from '@vx-agent-editor/shared/domain'


export const Route = createFileRoute('/home/projects/')({
    loader: async () => {
        // Depth 1: projects. Await so we know each project's root_folder_id.
        const projects = await QuerySDK.client.fetchQuery({
            queryKey: ['projects'],
            queryFn: () => LibrarySDK.actions.project.list(),
            staleTime: 60_000,
        })

        // Depth 2: fire-and-forget prefetch of each project's root folder contents.
        for (const p of projects) {
            if (!p.root_folder_id) continue
            QuerySDK.client.prefetchQuery({
                queryKey: ['folders', p.root_folder_id, 'contents'],
                queryFn: () => LibrarySDK.actions.folder.getContents(p.root_folder_id!),
                staleTime: 60_000,
            })
        }

        return null
    },
    component: ProjectsRoute,
})


function ProjectsRoute() {
    // The loader already kicked off the fetch; useQuery just subscribes + handles refetch.
    QuerySDK.useQuery(['projects'], () => LibrarySDK.actions.project.list(), {
        staleTime: 60_000,
    })

    const projects = LibrarySDK.useStore(
        useShallow((s) => Object.values(s.projects).sort(
            (a, b) => b.created_at.localeCompare(a.created_at),
        )),
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


function ProjectCard({ project }: { project: Library.Project }) {
    const rootFolderId = LibrarySDK.useStore((s) => s.rootFolderByProject[project.id])

    // Once the depth-2 prefetch lands, the action writes the folder rows into Zustand.
    // These selectors re-render when that happens.
    const childCount = LibrarySDK.useStore(
        useShallow((s) => rootFolderId
            ? Object.values(s.folders).filter((f) => f.parent_folder_id === rootFolderId).length
            : 0,
        ),
    )
    const workflowCount = LibrarySDK.useStore(
        useShallow((s) => rootFolderId
            ? Object.values(s.workflowMetas).filter((w) => w.folder_id === rootFolderId).length
            : 0,
        ),
    )

    return (
        <Link
            to="/home/projects/$folderId"
            params={{ folderId: rootFolderId! }}
            disabled={!rootFolderId}
            className="block p-4 rounded-xl border hover:bg-muted/40 transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted shrink-0">
                    <SystemIcons.Folder size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{project.display_name}</div>
                    {project.description && (
                        <p className="text-sm opacity-60 truncate mt-0.5">{project.description}</p>
                    )}
                    <div className="text-xs opacity-50 mt-2 flex items-center gap-3">
                        <span>{childCount} folder{childCount === 1 ? '' : 's'}</span>
                        <span>{workflowCount} workflow{workflowCount === 1 ? '' : 's'}</span>
                    </div>
                </div>
            </div>
        </Link>
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
