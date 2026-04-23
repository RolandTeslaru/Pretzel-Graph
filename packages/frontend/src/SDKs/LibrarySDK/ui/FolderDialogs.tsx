import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Dialog, Form, Input, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
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

export function openCreateFolderDialog(args: { parent_folder_id: Library.Folder.Id }) {
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

function CreateFolderContent({ dialogId, parent_folder_id }: { dialogId: string; parent_folder_id: Library.Folder.Id }) {
    const form = useForm<Values>({
        resolver: zodResolver(Schema),
        defaultValues: { display_name: '', description: '' },
    })

    const onSubmit = async (values: Values) => {
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
        <div className="p-3 flex flex-col gap-4">
            <Dialog.Header className="my-1">
                <Dialog.Title className="flex items-center gap-2">
                    <SystemIcons.Folder />
                    New folder
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    Create a subfolder inside the current folder.
                </Dialog.Description>
            </Dialog.Header>
            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
                    <Form.Field control={form.control} name="display_name" render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Name</Form.Label>
                            <Form.Control><Input {...field} placeholder="My folder" autoFocus /></Form.Control>
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

function EditFolderContent({ dialogId, folder }: { dialogId: string; folder: Library.Folder }) {
    const form = useForm<Values>({
        resolver: zodResolver(Schema),
        defaultValues: {
            display_name: folder.display_name || '',
            description: folder.description || '',
        },
    })

    const onSubmit = async (values: Values) => {
        try {
            await LibrarySDK.actions.folder.update({
                id: folder.id,
                display_name: values.display_name,
                description: values.description || null,
            })
            DialogSDK.actions.pop(dialogId)
        } catch (err) {
            console.error('Failed to update folder', err)
            toast.error('Failed to update folder')
        }
    }

    return (
        <div className="p-3 flex flex-col gap-4">
            <Dialog.Header className="my-1">
                <Dialog.Title className="flex items-center gap-2">
                    <SystemIcons.Folder />
                    Edit folder
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    Update folder metadata.
                </Dialog.Description>
            </Dialog.Header>
            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
                    <Form.Field control={form.control} name="display_name" render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Name</Form.Label>
                            <Form.Control><Input {...field} placeholder="My folder" autoFocus /></Form.Control>
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
