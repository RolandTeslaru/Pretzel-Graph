import { createFileRoute, Link } from '@tanstack/react-router'
import { DialogSDK } from '@/SDKs/DialogSDK/sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { AlertDialog, Button, DropdownMenu } from '@vx-agent-editor/vx-ui/foundations'
import { openCreateProjectDialog } from '@/SDKs/LibrarySDK/ui/CreateDialogs'
import type { Library } from '@vx-agent-editor/shared/domain'


export const Route = createFileRoute('/home/projects/')({
    loader: async () => {
        // Depth 1: projects. Await so we know each project's root_folder_id.
        const projects = await QuerySDK.client.fetchQuery({
            queryKey: ['projects'],
            queryFn: () => LibrarySDK.actions.project.list(),
            staleTime: 60_000,
        })

        // Depth 2: fire-and-forget prefetch of each project's contents
        for (const p of projects) {
            QuerySDK.client.prefetchQuery({
                queryKey: ['folders', p.id, 'contents'],
                queryFn: () => LibrarySDK.actions.folder.getContents(p.id),
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


function ProjectCard({ project }: { project: Library.Folder }) {
    // Once the depth-2 prefetch lands, the action writes the folder rows into Zustand.
    // These selectors re-render when that happens.
    const [childCount, workflowCount] = LibrarySDK.useStore(s => [
        Object.values(s.folders).filter((f) => f.parent_folder_id === project.id).length,
        Object.values(s.workflowMetas).filter((w) => w.folder_id === project.id).length
    ])

    return (
        <div className="relative rounded-xl border hover:bg-muted/40 transition-colors">
            <div className="absolute top-2 right-2 z-10">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" size="icon-xs" className="p-0!">
                            <SystemIcons.Ellipsis />
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                        <DropdownMenu.Item
                            variant="destructive"
                            onClick={() => openDeleteProjectDialog(project)}
                        >
                            <SystemIcons.Trash2 />
                            Delete project
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>

            <Link
                to="/home/projects/$folderId"
                params={{ folderId: project.id }}
                disabled={!project.id}
                className="block p-4 pr-11 aria-disabled:pointer-events-none aria-disabled:opacity-50"
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
        </div>
    )
}

function openDeleteProjectDialog(project: Library.Folder) {
    const dialogId = `delete-project-${project.id}`

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type="danger"
            onApprove={async () => {
                await LibrarySDK.actions.folder.delete(project.id)
                DialogSDK.actions.pop(dialogId)
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <AlertDialog.Title>
                Delete project?
            </AlertDialog.Title>
            <AlertDialog.Description>
                This action is irreversible. Deleting <span className="font-semibold text-destructive">{project.display_name}</span> will also delete all folders and workflows inside it.
            </AlertDialog.Description>
        </DialogSDK.AlertTemplate>
    ))
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
