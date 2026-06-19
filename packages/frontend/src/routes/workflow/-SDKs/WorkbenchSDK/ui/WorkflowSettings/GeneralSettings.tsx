import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Form, Input, Spinner, Switch } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { WorkbenchSDK } from '../../sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { Workflow } from '@pretzel-graph/shared/domain'
import { toast } from 'sonner'

const Schema = z.object({
    display_name: z.string().trim().min(1, 'Name is required'),
    description: z.string().trim().optional(),
    icon: z.string().trim().optional(),
    accent: z.string().trim().optional(),
    icon_color: z.string().trim().optional(),
    is_public: z.boolean(),
})
type Values = z.infer<typeof Schema>

export const GeneralSettings = () => {
    const workflowId = WorkbenchSDK.useStore(s => s.workflowId)
    const meta = LibrarySDK.useStore(s => s.workflowMetas[workflowId])

    const form = useForm<Values>({
        resolver: zodResolver(Schema),
        defaultValues: {
            display_name: meta?.display_name ?? '',
            description: meta?.description ?? '',
            icon: meta?.icon ?? '',
            accent: meta?.accent ?? '',
            icon_color: meta?.icon_color ?? '',
            is_public: meta?.is_public ?? false,
        },
    })

    const onSubmit = async (values: Values) => {
        try {
            await LibrarySDK.actions.workflow.update({
                id: workflowId,
                display_name: values.display_name,
                description: values.description || null,
                icon: values.icon || null,
                accent: values.accent || null,
                icon_color: values.icon_color || null,
                is_public: values.is_public,
            })
            toast.success('Workflow updated')
        } catch {
            toast.error('Failed to update workflow')
        }
    }

    return (
        <Form.Root {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4' autoComplete='off'>
                <div className='p-0.5 bg-card rounded-full absolute top-2 right-2 z-100 border border-border shadow-lg shadow-black/10 gap-1 inline-flex'>
                    <Button type='submit' variant='ghost' size='icon-sm' className='rounded-full' disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Spinner className='size-4' /> : <SystemIcons.Save className='size-4' />}
                    </Button>
                </div>

                <Form.Field control={form.control} name='display_name' render={({ field }) => (
                    <Form.Item>
                        <FieldRow label='Name'>
                            <Form.Control><Input size='sm' {...field} placeholder='Untitled workflow' /></Form.Control>
                        </FieldRow>
                        <Form.Message />
                    </Form.Item>
                )} />

                <Form.Field control={form.control} name='description' render={({ field }) => (
                    <Form.Item>
                        <FieldRow label='Description'>
                            <Form.Control><Input size='sm' {...field} placeholder='Optional' /></Form.Control>
                        </FieldRow>
                        <Form.Message />
                    </Form.Item>
                )} />

                <Form.Field control={form.control} name='icon' render={({ field }) => (
                    <Form.Item>
                        <FieldRow label='Icon'>
                            <Form.Control><Input size='sm' {...field} placeholder={Workflow.DEFAULT_ICON} /></Form.Control>
                        </FieldRow>
                        <Form.Message />
                    </Form.Item>
                )} />

                <Form.Field control={form.control} name='accent' render={({ field }) => (
                    <Form.Item>
                        <FieldRow label='Accent'>
                            <Form.Control><Input size='sm' {...field} placeholder={Workflow.DEFAULT_ACCENT} /></Form.Control>
                        </FieldRow>
                        <Form.Message />
                    </Form.Item>
                )} />

                <Form.Field control={form.control} name='icon_color' render={({ field }) => (
                    <Form.Item>
                        <FieldRow label='Icon color'>
                            <Form.Control><Input size='sm' {...field} placeholder={form.watch('accent')?.trim() || Workflow.DEFAULT_ACCENT} /></Form.Control>
                        </FieldRow>
                        <Form.Message />
                    </Form.Item>
                )} />

                <Form.Field control={form.control} name='is_public' render={({ field }) => (
                    <Form.Item>
                        <div className='rounded-md border border-border/50 bg-card/50 p-3 flex items-center justify-between'>
                            <div className='flex flex-col gap-0.5'>
                                <Form.Label>Public</Form.Label>
                                <span className='text-xs text-muted-foreground'>Anyone can view and use this workflow</span>
                            </div>
                            <Form.Control>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </Form.Control>
                        </div>
                    </Form.Item>
                )} />
            </form>
        </Form.Root>
    )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className='grid grid-cols-[100px_1fr] items-center gap-2 h-8'>
            <Form.Label className='text-xs text-muted-foreground'>{label}</Form.Label>
            {children}
        </div>
    )
}
