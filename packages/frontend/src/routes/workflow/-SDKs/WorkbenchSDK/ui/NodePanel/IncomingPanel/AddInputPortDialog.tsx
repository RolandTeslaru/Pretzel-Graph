import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Dialog, Form, Input, Select, Switch } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { WorkbenchSDK } from '../../../sdk'
import { Port } from '@pretzel-graph/shared/domain/Foundations/Port'
import type { Workflow } from '@pretzel-graph/shared/domain'

const VARIANT_OPTIONS = [
    'Message', 'MessageList', 'Text', 'Data', 'DataList',
    'Document', 'LanguageModel', 'Embeddings', 'VectorStore',
    'Retriever', 'Tool', 'ToolList', 'DataFrame', 'Integer', 'Json',
] as const satisfies readonly Port.Variant[]

const schema = z.object({
    displayName: z.string().trim().min(1, 'Name is required'),
    variant: Port.Variant,
    required: z.boolean(),
})
type Values = z.infer<typeof schema>

interface Props {
    nodeId: Workflow.Node.Id
    dialogId: string
}

export const AddInputPortDialog = ({ nodeId, dialogId }: Props) => {
    const form = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { displayName: '', variant: 'Data', required: false },
    })

    const onSubmit = (values: Values) => {
        const portId = Port.Input.Id.parse(crypto.randomUUID())
        WorkbenchSDK.actions.port.addInput(nodeId, Port.Input.Schema.parse({
            id: portId,
            displayName: values.displayName,
            variant: values.variant,
            required: values.required,
            isAddedByUser: true,
        }))
        DialogSDK.actions.pop(dialogId)
    }

    return (
        <div className='p-3 flex flex-col gap-4'>
            <Dialog.Header className='my-1'>
                <Dialog.Title>Add Input Port</Dialog.Title>
                <Dialog.Description className='text-muted-foreground'>
                    Define a new input port on this node.
                </Dialog.Description>
            </Dialog.Header>

            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4' autoComplete='off'>
                    <Form.Field control={form.control} name='displayName' render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Name</Form.Label>
                            <Form.Control>
                                <Input {...field} placeholder='e.g. context' autoFocus />
                            </Form.Control>
                            <Form.Message />
                        </Form.Item>
                    )} />

                    <Form.Field control={form.control} name='variant' render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Type</Form.Label>
                            <Select.Root value={field.value} onValueChange={field.onChange}>
                                <Form.Control>
                                    <Select.Trigger>
                                        <Select.Value />
                                    </Select.Trigger>
                                </Form.Control>
                                <Select.Content className='max-h-60 overflow-y-auto'>
                                    {VARIANT_OPTIONS.map(v => (
                                        <Select.Item key={v} value={v}>{v}</Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Root>
                            <Form.Message />
                        </Form.Item>
                    )} />

                    <Form.Field control={form.control} name='required' render={({ field }) => (
                        <Form.Item>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-0.5'>
                                    <Form.Label>Required</Form.Label>
                                    <span className='text-xs text-muted-foreground'>Connection must be provided to run</span>
                                </div>
                                <Form.Control>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </Form.Control>
                            </div>
                        </Form.Item>
                    )} />

                    <Dialog.Footer>
                        <Button type='button' variant='outline' onClick={() => DialogSDK.actions.pop(dialogId)}>
                            Cancel
                        </Button>
                        <Button type='submit'>
                            Add
                        </Button>
                    </Dialog.Footer>
                </form>
            </Form.Root>
        </div>
    )
}
