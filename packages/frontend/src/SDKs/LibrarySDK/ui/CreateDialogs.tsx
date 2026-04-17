import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Dialog, Form, Input, Spinner } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { LibrarySDK } from '../sdk'
import { QuerySDK } from '@/SDKs/QuerySDK/sdk'
import type { Library } from '@vx-agent-editor/shared/domain'
import { toast } from 'sonner'


const DIALOG_CLASSNAME = 'sm:max-w-[480px] w-full'


// ─────────────────────────────────────────────────────────────
// Shared form schema (display_name + optional description)
// ─────────────────────────────────────────────────────────────
const MetaSchema = z.object({
    display_name: z.string().trim().min(1, 'Name is required'),
    description: z.string().trim().optional(),
})
type MetaValues = z.infer<typeof MetaSchema>


// ─────────────────────────────────────────────────────────────
// New project
// ─────────────────────────────────────────────────────────────
export function openCreateProjectDialog() {
    const id = 'create-project'
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.Template {...props} className={DIALOG_CLASSNAME}>
            <CreateProjectContent dialogId={id} />
        </DialogSDK.Template>
    ))
}

export function openEditProjectDialog(args: { project: Library.Folder }) {
    const id = `edit-project-${args.project.id}`
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.Template {...props} className={DIALOG_CLASSNAME}>
            <EditProjectContent dialogId={id} project={args.project} />
        </DialogSDK.Template>
    ))
}

function CreateProjectContent({ dialogId }: { dialogId: string }) {
    const form = useForm<MetaValues>({
        resolver: zodResolver(MetaSchema),
        defaultValues: { display_name: '', description: '' },
    })

    const onSubmit = async (values: MetaValues) => {
        try {
            await LibrarySDK.actions.project.create({
                display_name: values.display_name,
                description: values.description || null,
            })
            DialogSDK.actions.pop(dialogId)
        } catch (err) {
            console.error('Failed to create project', err)
            toast.error('Failed to create project')
        }
    }

    return (
        <MetaFormShell
            title="New project"
            description="Projects hold folders and workflows."
            namePlaceholder="My project"
            icon={<SystemIcons.FolderOpen />}
            dialogId={dialogId}
            form={form}
            onSubmit={onSubmit}
        />
    )
}

function EditProjectContent({
    dialogId,
    project,
}: {
    dialogId: string
    project: Library.Folder
}) {
    const form = useForm<MetaValues>({
        resolver: zodResolver(MetaSchema),
        defaultValues: {
            display_name: project.display_name || '',
            description: project.description || '',
        },
    })

    const onSubmit = async (values: MetaValues) => {
        try {
            await LibrarySDK.actions.project.update({
                id: project.id,
                display_name: values.display_name,
                description: values.description || null,
            })
            DialogSDK.actions.pop(dialogId)
        } catch (err) {
            console.error('Failed to update project', err)
            toast.error('Failed to update project')
        }
    }

    return (
        <MetaFormShell
            title="Edit project"
            description="Update project metadata."
            namePlaceholder="My project"
            icon={<SystemIcons.FolderOpen />}
            dialogId={dialogId}
            form={form}
            onSubmit={onSubmit}
            submitLabel="Save"
        />
    )
}


// ─────────────────────────────────────────────────────────────
// New folder
// ─────────────────────────────────────────────────────────────
export function openCreateFolderDialog(args: {
    parent_folder_id: Library.Folder.Id
}) {
    const id = `create-folder-${args.parent_folder_id}`
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.Template {...props} className={DIALOG_CLASSNAME}>
            <CreateFolderContent dialogId={id} {...args} />
        </DialogSDK.Template>
    ))
}

export function openEditFolderDialog(args: { folder: Library.Folder }) {
    const id = `edit-folder-${args.folder.id}`
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.Template {...props} className={DIALOG_CLASSNAME}>
            <EditFolderContent dialogId={id} folder={args.folder} />
        </DialogSDK.Template>
    ))
}

function CreateFolderContent({
    dialogId,
    parent_folder_id,
}: {
    dialogId: string
    parent_folder_id: Library.Folder.Id
}) {
    const form = useForm<MetaValues>({
        resolver: zodResolver(MetaSchema),
        defaultValues: { display_name: '', description: '' },
    })

    const onSubmit = async (values: MetaValues) => {
        try {
            await LibrarySDK.actions.folder.create({
                parent_folder_id,
                display_name: values.display_name,
                description: values.description || null,
            })
            DialogSDK.actions.pop(dialogId)
        } catch (err) {
            console.error('Failed to create folder', err)
            toast.error('Failed to create folder')
        }
    }

    return (
        <MetaFormShell
            title="New folder"
            description="Create a subfolder inside the current folder."
            namePlaceholder="My folder"
            icon={<SystemIcons.Folder />}
            dialogId={dialogId}
            form={form}
            onSubmit={onSubmit}
        />
    )
}

function EditFolderContent({
    dialogId,
    folder,
}: {
    dialogId: string
    folder: Library.Folder
}) {
    const form = useForm<MetaValues>({
        resolver: zodResolver(MetaSchema),
        defaultValues: {
            display_name: folder.display_name || '',
            description: folder.description || '',
        },
    })

    const onSubmit = async (values: MetaValues) => {
        try {
            await LibrarySDK.actions.folder.update({
                id: folder.id,
                display_name: values.display_name,
                description: values.description || null,
            })
            // await QuerySDK.client.invalidateQueries({ queryKey: ['folders', folder.id, 'contents'] })
            DialogSDK.actions.pop(dialogId)
        } catch (err) {
            console.error('Failed to update folder', err)
            toast.error('Failed to update folder')
        }
    }

    return (
        <MetaFormShell
            title="Edit folder"
            description="Update folder metadata."
            namePlaceholder="My folder"
            icon={<SystemIcons.Folder />}
            dialogId={dialogId}
            form={form}
            onSubmit={onSubmit}
            submitLabel="Save"
        />
    )
}


// ─────────────────────────────────────────────────────────────
// New workflow
// ─────────────────────────────────────────────────────────────
export function openCreateWorkflowDialog(args: { folder_id: Library.Folder.Id }) {
    const id = `create-workflow-${args.folder_id}`
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.Template {...props} className={DIALOG_CLASSNAME}>
            <CreateWorkflowContent dialogId={id} {...args} />
        </DialogSDK.Template>
    ))
}

export function openEditWorkflowDialog(args: { workflow: Library.WorkflowMeta }) {
    const id = `edit-workflow-${args.workflow.id}`
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.Template {...props} className={DIALOG_CLASSNAME}>
            <EditWorkflowContent dialogId={id} workflow={args.workflow} />
        </DialogSDK.Template>
    ))
}

function EditWorkflowContent({
    dialogId,
    workflow,
}: {
    dialogId: string
    workflow: Library.WorkflowMeta
}) {
    const form = useForm<MetaValues>({
        resolver: zodResolver(MetaSchema),
        defaultValues: {
            display_name: workflow.display_name || '',
            description: workflow.description || '',
        },
    })

    const onSubmit = async (values: MetaValues) => {
        try {
            await LibrarySDK.actions.workflow.update({
                id: workflow.id,
                display_name: values.display_name,
                description: values.description || null,
            })
            // await QuerySDK.client.invalidateQueries({ queryKey: ['folders', workflow.folder_id, 'contents'] })
            DialogSDK.actions.pop(dialogId)
        } catch (err) {
            console.error('Failed to update workflow', err)
            toast.error('Failed to update workflow')
        }
    }

    return (
        <MetaFormShell
            title="Edit workflow"
            description="Update workflow metadata."
            namePlaceholder="Untitled workflow"
            icon={<SystemIcons.Graph />}
            dialogId={dialogId}
            form={form}
            onSubmit={onSubmit}
            submitLabel="Save"
        />
    )
}

function CreateWorkflowContent({
    dialogId,
    folder_id,
}: {
    dialogId: string
    folder_id: Library.Folder.Id
}) {
    const form = useForm<MetaValues>({
        resolver: zodResolver(MetaSchema),
        defaultValues: { display_name: '', description: '' },
    })

    const onSubmit = async (values: MetaValues) => {
        try {
            await LibrarySDK.actions.workflow.create({
                folder_id,
                display_name: values.display_name,
                description: values.description || null,
            })
            DialogSDK.actions.pop(dialogId)
        } catch (err) {
            console.error('Failed to create workflow', err)
            toast.error('Failed to create workflow')
        }
    }

    return (
        <MetaFormShell
            title="New workflow"
            description="Start a new workflow in this folder."
            namePlaceholder="Untitled workflow"
            icon={<SystemIcons.Graph />}
            dialogId={dialogId}
            form={form}
            onSubmit={onSubmit}
        />
    )
}


// ─────────────────────────────────────────────────────────────
// Shared form shell
// ─────────────────────────────────────────────────────────────
function MetaFormShell({
    title,
    description,
    namePlaceholder,
    icon,
    dialogId,
    form,
    onSubmit,
    submitLabel = 'Create',
}: {
    title: string
    description: string
    namePlaceholder: string
    icon?: React.ReactNode
    dialogId: string
    form: ReturnType<typeof useForm<MetaValues>>
    onSubmit: (values: MetaValues) => Promise<void>
    submitLabel?: string
}) {
    return (
        <div className="p-3 flex flex-col gap-4">
            <Dialog.Header className="my-1">
                <Dialog.Title className="flex items-center gap-2">
                    {icon}
                    {title}
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    {description}
                </Dialog.Description>
            </Dialog.Header>

            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
                    <Form.Field
                        control={form.control}
                        name="display_name"
                        render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Name</Form.Label>
                                <Form.Control>
                                    <Input {...field} placeholder={namePlaceholder} autoFocus />
                                </Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )}
                    />
                    <Form.Field
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Description</Form.Label>
                                <Form.Control>
                                    <Input {...field} placeholder="Optional" />
                                </Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )}
                    />

                    <Dialog.Footer>
                        <Button type="button" variant="outline" onClick={() => DialogSDK.actions.pop(dialogId)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                            {submitLabel}
                        </Button>
                    </Dialog.Footer>
                </form>
            </Form.Root>
        </div>
    )
}
