import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Dialog, Form, Input, Spinner } from '@pretzel-graph/vx-ui/foundations'
import { SystemIcons } from '@pretzel-graph/vx-ui/icons'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { LibrarySDK } from '../sdk'
import type { Library } from '@pretzel-graph/shared/domain'
import { toast } from 'sonner'

const DIALOG_CLASSNAME = 'sm:max-w-[480px] w-full'

const Schema = z.object({
    display_name: z.string().trim().min(1, 'Name is required'),
    description: z.string().trim().optional(),
})
type Values = z.infer<typeof Schema>

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
    const form = useForm<Values>({
        resolver: zodResolver(Schema),
        defaultValues: { display_name: '', description: '' },
    })

    const onSubmit = async (values: Values) => {
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
        <div className="p-3 flex flex-col gap-4">
            <Dialog.Header className="my-1">
                <Dialog.Title className="flex items-center gap-2">
                    <SystemIcons.FolderOpen />
                    New project
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    Projects hold folders and workflows.
                </Dialog.Description>
            </Dialog.Header>
            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
                    <Form.Field control={form.control} name="display_name" render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Name</Form.Label>
                            <Form.Control><Input {...field} placeholder="My project" autoFocus /></Form.Control>
                            <Form.Message />
                        </Form.Item>
                    )} />
                    <Form.Field control={form.control} name="description" render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Description</Form.Label>
                            <Form.Control><Input {...field} placeholder="Optional" /></Form.Control>
                            <Form.Message />
                        </Form.Item>
                    )} />
                    <Dialog.Footer>
                        <Button type="button" variant="outline" onClick={() => DialogSDK.actions.pop(dialogId)}>Cancel</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                            Create
                        </Button>
                    </Dialog.Footer>
                </form>
            </Form.Root>
        </div>
    )
}

function EditProjectContent({ dialogId, project }: { dialogId: string; project: Library.Folder }) {
    const form = useForm<Values>({
        resolver: zodResolver(Schema),
        defaultValues: {
            display_name: project.display_name || '',
            description: project.description || '',
        },
    })

    const onSubmit = async (values: Values) => {
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
        <div className="p-3 flex flex-col gap-4">
            <Dialog.Header className="my-1">
                <Dialog.Title className="flex items-center gap-2">
                    <SystemIcons.FolderOpen />
                    Edit project
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    Update project metadata.
                </Dialog.Description>
            </Dialog.Header>
            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
                    <Form.Field control={form.control} name="display_name" render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Name</Form.Label>
                            <Form.Control><Input {...field} placeholder="My project" autoFocus /></Form.Control>
                            <Form.Message />
                        </Form.Item>
                    )} />
                    <Form.Field control={form.control} name="description" render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Description</Form.Label>
                            <Form.Control><Input {...field} placeholder="Optional" /></Form.Control>
                            <Form.Message />
                        </Form.Item>
                    )} />
                    <Dialog.Footer>
                        <Button type="button" variant="outline" onClick={() => DialogSDK.actions.pop(dialogId)}>Cancel</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                            Save
                        </Button>
                    </Dialog.Footer>
                </form>
            </Form.Root>
        </div>
    )
}
