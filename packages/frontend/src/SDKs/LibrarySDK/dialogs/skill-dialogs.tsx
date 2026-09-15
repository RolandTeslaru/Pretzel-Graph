import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertDialog, Button, Dialog, Form, Input, Spinner, Textarea } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { Skill, SystemError, type Library } from '@pretzel-graph/shared/domain'
import { MonacoEditor } from '@/components/MonacoEditor'
import { LibrarySDK } from '../sdk'
import { toast } from 'sonner'

const DIALOG_CLASSNAME = 'sm:max-w-[480px] w-full'

const EDITOR_OPTIONS = { wordWrap: 'on', lineNumbers: 'off', padding: { top: 64, bottom: 64 } } as const

const NameSchema = z.string().trim()
    .min(1, 'Name is required')
    .max(64, 'At most 64 characters')
    .regex(Skill.NAME_PATTERN, 'Lowercase letters, digits and single hyphens only')

const CreateSchema = z.object({
    name: NameSchema,
    description: z.string().trim().max(1024, 'At most 1024 characters'),
})
type CreateValues = z.infer<typeof CreateSchema>

const EditSchema = CreateSchema.extend({
    icon: z.string().trim().optional(),
    accent: z.string().trim().optional(),
    content: z.string(),
})
type EditValues = z.infer<typeof EditSchema>

const SkillTitleIcon = () => (
    <SystemIcons.Sparkles2 className="size-6 shrink-0" style={{ color: `var(--${Skill.DEFAULT_ACCENT})` }} />
)


export function openCreateSkillDialog(args: { folder_id: Library.Folder.Id }) {
    const id = `create-skill-${args.folder_id}`
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.Template {...props} className={DIALOG_CLASSNAME}>
            <CreateSkillContent dialogId={id} {...args} />
        </DialogSDK.Template>
    ))
}

function CreateSkillContent({ dialogId, folder_id }: { dialogId: string; folder_id: Library.Folder.Id }) {
    const form = useForm<CreateValues>({
        resolver: zodResolver(CreateSchema),
        defaultValues: { name: '', description: '' },
    })

    const onSubmit = async (values: CreateValues) => {
        try {
            const skill = await LibrarySDK.actions.skill.create({
                folder_id,
                name: values.name,
                description: values.description,
            })
            DialogSDK.actions.pop(dialogId)
            openSkillEditorDialog({ skillId: skill.id })
        } catch (err) {
            console.error('Failed to create skill', err)
            toast.error(`Failed to create skill: ${SystemError.fromUnknown(err).message}`)
        }
    }

    return (
        <div className="p-3 flex flex-col gap-4">
            <Dialog.Header className="my-1">
                <Dialog.Title className="flex items-center gap-2">
                    <SkillTitleIcon />
                    New skill
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    A skill is a set of instructions an agent can load when a task calls for it.
                </Dialog.Description>
            </Dialog.Header>
            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
                    <Form.Field control={form.control} name="name" render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Name</Form.Label>
                            <Form.Control><Input {...field} placeholder="review-pull-requests" autoFocus /></Form.Control>
                            <Form.Message />
                        </Form.Item>
                    )} />
                    <Form.Field control={form.control} name="description" render={({ field }) => (
                        <Form.Item>
                            <Form.Label>Description</Form.Label>
                            <Form.Control><Textarea {...field} rows={3} placeholder="When the agent should use this skill" /></Form.Control>
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


export function openSkillEditorDialog(args: { skillId: Skill.Id }) {
    const id = `skill-editor-${args.skillId}`
    DialogSDK.actions.push(id, (props) => (
        <SkillEditor dialogProps={props} dialogId={id} skillId={args.skillId} />
    ))
}

interface SkillEditorProps {
    dialogProps: DialogSDK.TemplateProps
    dialogId: string
    skillId: Skill.Id
}

function SkillEditor({ dialogProps, dialogId, skillId }: SkillEditorProps) {
    const [skill, setSkill] = useState<Skill | null>(null)

    useEffect(() => {
        LibrarySDK.actions.skill.get(skillId)
            .then(setSkill)
            .catch((err) => {
                console.error('Failed to load skill', err)
                toast.error(`Failed to load skill: ${SystemError.fromUnknown(err).message}`)
                DialogSDK.actions.pop(dialogId)
            })
    }, [skillId, dialogId])

    if (!skill) {
        return (
            <DialogSDK.Template {...dialogProps}>
                <div className="p-10 flex justify-center">
                    <Spinner />
                </div>
            </DialogSDK.Template>
        )
    }

    return <SkillEditorContent dialogProps={dialogProps} dialogId={dialogId} skill={skill} />
}

function SkillEditorContent({ dialogProps, dialogId, skill }: Omit<SkillEditorProps, 'skillId'> & { skill: Skill }) {
    const form = useForm<EditValues>({
        resolver: zodResolver(EditSchema),
        defaultValues: {
            name: skill.name,
            description: skill.description,
            icon: skill.icon ?? '',
            accent: skill.accent ?? '',
            content: skill.content,
        },
    })

    const setContent = useCallback(
        (content: string) => form.setValue('content', content, { shouldDirty: true }),
        [form],
    )

    const onSubmit = async (values: EditValues) => {
        try {
            await LibrarySDK.actions.skill.update({
                id: skill.id,
                name: values.name,
                description: values.description,
                content: values.content,
                icon: values.icon || null,
                accent: values.accent || null,
            })
            toast.success('Skill saved')
            DialogSDK.actions.pop(dialogId)
        } catch (err) {
            console.error('Failed to save skill', err)
            toast.error(`Failed to save skill: ${SystemError.fromUnknown(err).message}`)
        }
    }

    return (
        <DialogSDK.SplitTemplate {...dialogProps}
            sidebarClassName='w-[300px] shrink-0'
            contentClassName='p-0!'
            sidebarRenderer={() => (
                <Form.Root {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col gap-4" autoComplete="off">
                        <Dialog.Title className="flex items-center gap-2 text-base">
                            <SkillTitleIcon />
                            Edit skill
                        </Dialog.Title>
                        <Form.Field control={form.control} name="name" render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Name</Form.Label>
                                <Form.Control><Input {...field} /></Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )} />
                        <Form.Field control={form.control} name="description" render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Description</Form.Label>
                                <Form.Control><Textarea {...field} rows={5} placeholder="When the agent should use this skill" /></Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )} />
                        {/* <div className="grid grid-cols-2 gap-3">
                            <Form.Field control={form.control} name="icon" render={({ field }) => (
                                <Form.Item>
                                    <Form.Label>Icon</Form.Label>
                                    <Form.Control><Input {...field} placeholder={Skill.DEFAULT_ICON} /></Form.Control>
                                    <Form.Message />
                                </Form.Item>
                            )} />
                            <Form.Field control={form.control} name="accent" render={({ field }) => (
                                <Form.Item>
                                    <Form.Label>Accent</Form.Label>
                                    <Form.Control><Input {...field} placeholder={Skill.DEFAULT_ACCENT} /></Form.Control>
                                    <Form.Message />
                                </Form.Item>
                            )} />
                        </div> */}
                    </form>
                </Form.Root>
            )}
        >
            <div className="relative h-[600px] w-[680px] shrink-0">
                {/* Header */}
                <div className='pointer-events-none absolute top-0 w-full left-0 z-90 flex flex-row gap-2 items-center px-4 pt-5 pb-4'>
                    <p className='text-sm font-medium text-foreground'>Edit Content</p>
                </div>

                {/* Content */}
                <div className='h-full [mask-image:linear-gradient(to_bottom,transparent_0,black_80px,black_calc(100%_-_80px),transparent_100%)]'>
                    <MonacoEditor
                        height="100%"
                        defaultLanguage="markdown"
                        defaultValue={skill.content}
                        onChange={setContent}
                        options={EDITOR_OPTIONS}
                    />
                </div>

                {/* Footer */}
                <div className='pointer-events-none absolute bottom-0 left-0 right-0 px-4 pb-4 pt-2 w-full flex'>
                    <div className='ml-auto gap-2 flex'>
                        <Button type='button' variant='outline' className='pointer-events-auto rounded-full' onClick={() => DialogSDK.actions.pop(dialogId)}>
                            Cancel
                        </Button>
                        <Button type='button' className='pointer-events-auto rounded-full' onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Spinner className='size-3.5' />}
                            Save
                        </Button>
                    </div>
                </div>
            </div>
        </DialogSDK.SplitTemplate>
    )
}


export function openDeleteSkillDialog(skill: Skill.Meta) {
    const dialogId = `delete-skill-${skill.id}`

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type='danger'
            onApprove={async () => {
                await LibrarySDK.actions.skill.delete(skill.id)
                DialogSDK.actions.pop(dialogId)
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <AlertDialog.Title>
                Delete skill?
            </AlertDialog.Title>
            <AlertDialog.Description>
                Deleting <span className='font-semibold text-destructive'>{skill.name}</span> cannot be undone. Workflows that use it keep their own copy.
            </AlertDialog.Description>
        </DialogSDK.AlertTemplate>
    ))
}
