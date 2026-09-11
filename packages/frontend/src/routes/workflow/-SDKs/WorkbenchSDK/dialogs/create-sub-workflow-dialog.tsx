import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Dialog, Form, Input } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { WorkbenchSDK } from '../sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import type { Workflow } from '@pretzel-graph/shared/domain'

const NameSchema = z.object({
    display_name: z.string().trim().min(1, 'Name is required'),
})
type NameValues = z.infer<typeof NameSchema>

interface Props {
    dialogId: string
    nodeIds: Workflow.Node.Id[]
    edgeIds: Workflow.Edge.Id[]
}

export function openCreateSubWorkflowDialog(nodeIds: Workflow.Node.Id[], edgeIds: Workflow.Edge.Id[]) {
    const id = 'create-sub-workflow'
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.SplitTemplate
            {...props}
            sidebarClassName='w-[260px]'
            contentClassName='w-[400px]'
            sidebarRenderer={() => (
                <div className='flex flex-col gap-2'>
                    <div className='flex flex-row items-center gap-2'>
                        <SystemIcons.Graph className='size-5 shrink-0' />
                        <p className='text-md font-semibold text-foreground'>Create Sub-Workflow</p>
                    </div>

                    <p className='text-xs text-muted-foreground'>
                        Extract the selected nodes into a new reusable sub-workflow.
                    </p>
                </div>
            )}
        >
            <CreateSubWorkflowContent dialogId={id} nodeIds={nodeIds} edgeIds={edgeIds} />
        </DialogSDK.SplitTemplate>
    ))
}

const CreateSubWorkflowContent = ({ dialogId, nodeIds, edgeIds }: Props) => {
    const form = useForm<NameValues>({
        resolver: zodResolver(NameSchema),
        defaultValues: { display_name: '' },
    })

    // The name is taken here; the folder is picked in the library browser on top of this dialog.
    const onSubmit = (values: NameValues) => {
        LibrarySDK.dialogs.openResourceSelector({
            accept: 'folder',
            initialFolderId: LibrarySDK.selectors.folderOf(WorkbenchSDK.document.workflowId),
            onSelect: (folder) => {
                WorkbenchSDK.actions.subWorkflow.create(nodeIds, edgeIds, values.display_name, folder.id)
                DialogSDK.actions.pop(dialogId)
            },
        })
    }

    return (
        <div className='flex flex-col h-[300px] gap-4'>
            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4 h-full' autoComplete='off'>
                    <Form.Field
                        control={form.control}
                        name='display_name'
                        render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Name</Form.Label>
                                <Form.Control>
                                    <Input {...field} placeholder='Untitled sub-workflow' autoFocus />
                                </Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )}
                    />
                    <Dialog.Footer className='mt-auto h-auto'>
                        <Button type='button' variant='outline' onClick={() => DialogSDK.actions.pop(dialogId)}>
                            Cancel
                        </Button>
                        <Button type='submit'>
                            Choose Folder
                        </Button>
                    </Dialog.Footer>
                </form>
            </Form.Root>
        </div>
    )
}
