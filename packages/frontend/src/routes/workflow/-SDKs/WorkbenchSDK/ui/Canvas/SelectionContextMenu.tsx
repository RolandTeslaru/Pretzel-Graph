import React, { memo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { WorkbenchSDK } from '../../sdk'
import { DropdownMenu } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { Button, Dialog, Form, Input } from '@vx-agent-editor/vx-ui/foundations'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { Workflow } from '@vx-agent-editor/shared/domain'

const NameSchema = z.object({
    display_name: z.string().trim().min(1, 'Name is required'),
})
type NameValues = z.infer<typeof NameSchema>

function openCreateSubWorkflowDialog(nodeIds: Workflow.Node.Id[], edgeIds: Workflow.Edge.Id[]) {
    const id = 'create-sub-workflow'
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.Template {...props} className='sm:max-w-112.5 w-full'>
            <CreateSubWorkflowContent dialogId={id} nodeIds={nodeIds} edgeIds={edgeIds} />
        </DialogSDK.Template>
    ))
}

function CreateSubWorkflowContent({
    dialogId,
    nodeIds,
    edgeIds,
}: {
    dialogId: string
    nodeIds: Workflow.Node.Id[]
    edgeIds: Workflow.Edge.Id[]
}) {
    const form = useForm<NameValues>({
        resolver: zodResolver(NameSchema),
        defaultValues: { display_name: '' },
    })

    const onSubmit = (values: NameValues) => {
        WorkbenchSDK.actions.createSubWorkflow(nodeIds, edgeIds, values.display_name)
        DialogSDK.actions.pop(dialogId)
    }

    return (
        <div className='p-3 flex flex-col gap-4'>
            <Dialog.Header className='my-1'>
                <Dialog.Title className='flex items-center gap-2'>
                    <SystemIcons.Graph />
                    Create Sub-Workflow
                </Dialog.Title>
                <Dialog.Description className='text-muted-foreground'>
                    Extract the selected nodes into a new reusable sub-workflow.
                </Dialog.Description>
            </Dialog.Header>

            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4' autoComplete='off'>
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
                    <Dialog.Footer>
                        <Button type='button' variant='outline' onClick={() => DialogSDK.actions.pop(dialogId)}>
                            Cancel
                        </Button>
                        <Button type='submit'>
                            Create
                        </Button>
                    </Dialog.Footer>
                </form>
            </Form.Root>

        </div>
    )
}

export const SelectionContextMenu: React.FC = memo(() => {
    const [menu, selectedNodeCount] = WorkbenchSDK.useStore(s => [s.selectionContextMenu, s.lastSelection?.nodes.length || 0] as const);
    const close = () => WorkbenchSDK.actions.setSelectionContextMenu(null);

    if (!menu) return null;

    const handleCreateSubWorkflow = () => {
        const selection = WorkbenchSDK.state.lastSelection;
        if (!selection) return;
        const nodeIds = selection.nodes.map(n => n.id as Workflow.Node.Id);
        const edgeIds = selection.edges.map(e => e.id as Workflow.Edge.Id);
        close();
        openCreateSubWorkflowDialog(nodeIds, edgeIds);
    }

    return (
        <div style={{ position: 'fixed', top: menu.y, left: menu.x, width: 0, height: 0 }}>
            <DropdownMenu.Root
                open
                onOpenChange={(open) => { if (!open) close(); }}
            >
                <DropdownMenu.Trigger className='size-0 opacity-0 pointer-events-none' />
                <DropdownMenu.Content align='start' side='bottom' sideOffset={0}>
                    <DropdownMenu.Label className='font-medium text-sm px-2 py-1'>
                        {`${selectedNodeCount} Selected Nodes`}
                    </DropdownMenu.Label>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item onSelect={() => { WorkbenchSDK.actions.clipboard.copy(); close(); }}>
                        <SystemIcons.Clipboard /> Copy
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => { WorkbenchSDK.actions.selection.duplicate(); close(); }}>
                        <SystemIcons.Copy /> Duplicate
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => { WorkbenchSDK.actions.selection.disable(true); close(); }}>
                        <SystemIcons.Power /> Disable
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={handleCreateSubWorkflow}>
                        <SystemIcons.Graph /> Create Sub-Workflow
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item variant='destructive' onSelect={() => { WorkbenchSDK.actions.selection.delete(); close(); }}>
                        <SystemIcons.Trash2 /> Delete
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    );
})
