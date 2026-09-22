import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Dialog, Form, Input, Select, Switch } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { WorkbenchSDK } from '../sdk'
import { Port } from '@pretzel-graph/shared/domain/Foundations/Port'
import type { Workflow } from '@pretzel-graph/shared/domain'
import { INPUT_PORT_VARIANTS, inputPortSchema, type InputPortValues } from './input-port-schema'

interface Props {
    nodeId: Workflow.Node.Id
    port: Port.Input
    dialogId: string
}

export function openEditInputPortDialog(nodeId: Workflow.Node.Id, port: Port.Input) {
    const id = `edit-input-port-${nodeId}-${port.id}`
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.SplitTemplate
            {...props}
            sidebarClassName='w-[260px]'
            contentClassName='w-[420px]'
            sidebarRenderer={() => (
                <DialogSDK.SplitTemplate.Header>
                    <DialogSDK.SplitTemplate.Icon icon={SystemIcons.SquarePen} />
                    <DialogSDK.SplitTemplate.Title>Edit Input Port</DialogSDK.SplitTemplate.Title>
                    <DialogSDK.SplitTemplate.Description>
                        Change this input port's ID, name, or type.
                    </DialogSDK.SplitTemplate.Description>
                </DialogSDK.SplitTemplate.Header>
            )}
        >
            <Dialog.Title className='hidden'>Edit Input Port</Dialog.Title>
            <Dialog.Description className='hidden'>Change this input port's ID, name, or type</Dialog.Description>
            <EditInputPortContent nodeId={nodeId} port={port} dialogId={id} />
        </DialogSDK.SplitTemplate>
    ))
}

const EditInputPortContent = ({ nodeId, port, dialogId }: Props) => {
    const form = useForm<InputPortValues>({
        resolver: zodResolver(inputPortSchema),
        mode: 'onSubmit',
        defaultValues: {
            id:          port.id,
            displayName: port.displayName ?? '',
            variant:     port.variant as InputPortValues['variant'],
            required:    port.required ?? false,
        },
    })

    const isIdChanged = useWatch({ control: form.control, name: 'id' }).trim() !== port.id

    const onSubmit = (values: InputPortValues) => {
        const state = WorkbenchSDK.document

        const takenIds = new Set<string>(
            state.selectors.node.ports.getInputs(state, nodeId)
                .map(p => p.id)
                .filter(id => id !== port.id)
        )
        if (takenIds.has(values.id)) {
            form.setError('id', { message: `ID "${values.id}" is already in use on this node` })
            return
        }

        WorkbenchSDK.actions.port.updateInput(nodeId, port.id, Port.Input.Schema.parse({
            id: Port.Input.Id.parse(values.id),
            displayName: values.displayName,
            variant: values.variant,
            required: values.required,
            isAddedByUser: true,
        }))
        DialogSDK.actions.pop(dialogId)
    }

    return (
        <div className='flex flex-col gap-4'>
            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4' autoComplete='off'>
                    <Form.Field control={form.control} name='id' render={({ field }) => (
                        <Form.Item>
                            <Form.Label>ID</Form.Label>
                            <Form.Control>
                                <Input {...field} placeholder='e.g. context' autoFocus />
                            </Form.Control>
                            <Form.Message />
                            {isIdChanged &&
                                <span className='text-xs text-warning-text'>
                                    Expressions and code that read <code>$in.{port.id}</code> won't be updated.
                                </span>
                            }
                        </Form.Item>
                    )} />

                    <Form.Field control={form.control} name='displayName' render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Name</Form.Label>
                            <Form.Control>
                                <Input {...field} placeholder='e.g. Context' />
                            </Form.Control>
                            <Form.Message />
                        </Form.Item>
                    )} />

                    <Form.Field control={form.control} name='variant' render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Type</Form.Label>
                            <Form.Control>
                                <Select.Root value={field.value} onValueChange={field.onChange}>
                                    <Select.Trigger>
                                        <Select.Value placeholder='Select a type' />
                                    </Select.Trigger>
                                    <Select.Content className='max-h-60 overflow-y-auto'>
                                        {INPUT_PORT_VARIANTS.map(v => (
                                            <Select.Item key={v} value={v}>{v}</Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Form.Control>
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
                            Save
                        </Button>
                    </Dialog.Footer>
                </form>
            </Form.Root>
        </div>
    )
}
