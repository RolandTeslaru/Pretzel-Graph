import { useMemo, useState } from 'react'
import { Button, Dialog, Input, Select, Separator, Switch, Textarea } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { Foundations } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../sdk'
import { toast } from 'sonner'

const DIALOG_ID = 'workflow-configuration'
const DIALOG_CLASSNAME = 'sm:max-w-[680px] w-full'

type ConfigFieldVariant = 'String' | 'Secret' | 'Boolean' | 'Integer' | 'Float' | 'Json'
type ConfigField = Extract<Foundations.Field, { variant: ConfigFieldVariant }>

const FIELD_VARIANTS: ConfigFieldVariant[] = ['String', 'Secret', 'Boolean', 'Integer', 'Float', 'Json']

export function openWorkflowConfigurationDialog() {
    DialogSDK.actions.push(DIALOG_ID, (props) => (
        <DialogSDK.Template {...props} className={DIALOG_CLASSNAME}>
            <WorkflowConfigurationContent />
        </DialogSDK.Template>
    ))
}

function WorkflowConfigurationContent() {
    const workflowFields = WorkbenchSDK.useStore(s => s.data.fields ?? [])
    const [fields, setFields] = useState<ConfigField[]>(() => workflowFields.filter(isConfigField))
    const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>(() => {
        const drafts: Record<string, string> = {}

        for (const field of workflowFields) {
            if (field.variant === 'Json')
                drafts[field.id] = JSON.stringify(field.initialValue ?? {}, null, 2)
        }

        return drafts
    })

    const hasDuplicateIds = useMemo(() => {
        const ids = new Set<string>()
        for (const field of fields) {
            if (ids.has(field.id)) return true
            ids.add(field.id)
        }
        return false
    }, [fields])

    const addField = () => {
        const id = createUniqueFieldId(fields)
        setFields(current => [...current, createField('String', id, 'Configuration field')])
    }

    const updateField = (index: number, next: ConfigField) => {
        setFields(current => current.map((field, fieldIndex) => fieldIndex === index ? next : field))
    }

    const updateVariant = (index: number, variant: ConfigFieldVariant) => {
        const current = fields[index]
        const next = createField(variant, current.id, current.displayName)

        next.required = current.required
        next.description = current.description
        next.tooltip = current.tooltip

        updateField(index, next)

        if (variant === 'Json')
            setJsonDrafts(drafts => ({ ...drafts, [next.id]: JSON.stringify(next.initialValue, null, 2) }))
    }

    const updateId = (index: number, id: string) => {
        const current = fields[index]
        const nextId = toFieldId(id)
        const next = { ...current, id: nextId } as ConfigField

        updateField(index, next)

        if (current.variant === 'Json')
            setJsonDrafts(drafts => {
                const { [current.id]: previousDraft, ...rest } = drafts
                return { ...rest, [nextId]: previousDraft ?? JSON.stringify(current.initialValue ?? {}, null, 2) }
            })
    }

    const removeField = (index: number) => {
        setFields(current => current.filter((_, fieldIndex) => fieldIndex !== index))
    }

    const save = () => {
        if (hasDuplicateIds) {
            toast.error('Workflow field ids must be unique')
            return
        }

        for (const field of fields) {
            if (!field.id.trim()) {
                toast.error('Workflow field ids are required')
                return
            }
        }

        const parsedFields: ConfigField[] = []
        for (const field of fields) {
            if (field.variant !== 'Json') {
                parsedFields.push(field)
                continue
            }

            try {
                parsedFields.push({ ...field, initialValue: JSON.parse(jsonDrafts[field.id] ?? '{}') })
            } catch {
                toast.error(`Invalid JSON for ${field.displayName || field.id}`)
                return
            }
        }

        WorkbenchSDK.actions.workflow.setFields(parsedFields)
        DialogSDK.actions.pop(DIALOG_ID)
    }

    return (
        <div className="flex max-h-[82vh] flex-col gap-4 p-4">
            <Dialog.Header>
                <Dialog.Title className="flex items-center gap-2">
                    <SystemIcons.Settings className="size-4" />
                    Workflow Configuration
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    Define fields that appear on Execute Sub-Workflow nodes when this workflow is attached.
                </Dialog.Description>
            </Dialog.Header>

            <div className="flex min-h-0 flex-col overflow-y-auto pr-1">
                {fields.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        No workflow fields configured
                    </div>
                ) : (
                    fields.map((field, index) => (
                        <div key={index}>
                            {index > 0 && <Separator className="my-3" />}
                            <FieldEditor
                                field={field}
                                index={index}
                                jsonDraft={jsonDrafts[field.id] ?? '{}'}
                                onJsonDraftChange={(value) => setJsonDrafts(drafts => ({ ...drafts, [field.id]: value }))}
                                onChange={(next) => updateField(index, next)}
                                onIdChange={(id) => updateId(index, id)}
                                onVariantChange={(variant) => updateVariant(index, variant)}
                                onRemove={() => removeField(index)}
                            />
                        </div>
                    ))
                )}
            </div>

            <Dialog.Footer>
                <Button type="button" variant="outline" onClick={addField}>
                    <SystemIcons.Plus className="size-4" />
                    Add field
                </Button>
                <div className="flex flex-1 justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => DialogSDK.actions.pop(DIALOG_ID)}>Cancel</Button>
                    <Button type="button" onClick={save} disabled={hasDuplicateIds}>Save</Button>
                </div>
            </Dialog.Footer>
        </div>
    )
}

interface FieldEditorProps {
    field: ConfigField
    index: number
    jsonDraft: string
    onChange: (field: ConfigField) => void
    onIdChange: (id: string) => void
    onJsonDraftChange: (value: string) => void
    onVariantChange: (variant: ConfigFieldVariant) => void
    onRemove: () => void
}

function FieldEditor({
    field,
    index,
    jsonDraft,
    onChange,
    onIdChange,
    onJsonDraftChange,
    onVariantChange,
    onRemove,
}: FieldEditorProps) {
    return (
        <div className="py-1">
            <div className="grid grid-cols-[1fr_1fr_140px_32px] gap-2">
                <Input
                    size="sm"
                    value={field.displayName}
                    placeholder={`Field ${index + 1}`}
                    onChange={(event) => onChange({ ...field, displayName: event.target.value } as ConfigField)}
                />
                <Input
                    size="sm"
                    value={field.id}
                    placeholder="field_id"
                    onChange={(event) => onIdChange(event.target.value)}
                />
                <Select.Root value={field.variant} onValueChange={(value) => onVariantChange(value as ConfigFieldVariant)}>
                    <Select.Trigger size="sm">
                        <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                        {FIELD_VARIANTS.map(variant => (
                            <Select.Item key={variant} value={variant}>{variant}</Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>
                <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
                    <SystemIcons.Trash className="size-4" />
                </Button>
            </div>

            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <Input
                    size="sm"
                    value={field.description ?? ''}
                    placeholder="Description"
                    onChange={(event) => onChange({ ...field, description: event.target.value || undefined } as ConfigField)}
                />
                <label className="flex items-center gap-2 rounded-md border border-border px-2 text-xs text-muted-foreground">
                    Required
                    <Switch
                        checked={field.required}
                        onCheckedChange={(required) => onChange({ ...field, required } as ConfigField)}
                    />
                </label>
            </div>

            <div className="mt-2">
                <InitialValueEditor
                    field={field}
                    jsonDraft={jsonDraft}
                    onJsonDraftChange={onJsonDraftChange}
                    onChange={onChange}
                />
            </div>
        </div>
    )
}

function InitialValueEditor({
    field,
    jsonDraft,
    onJsonDraftChange,
    onChange,
}: {
    field: ConfigField
    jsonDraft: string
    onJsonDraftChange: (value: string) => void
    onChange: (field: ConfigField) => void
}) {
    if (field.variant === 'Boolean') {
        return (
            <label className="flex h-8 items-center justify-between rounded-md border border-border px-2 text-xs text-muted-foreground">
                Initial value
                <Switch checked={field.initialValue} onCheckedChange={(initialValue) => onChange({ ...field, initialValue })} />
            </label>
        )
    }

    if (field.variant === 'Json') {
        return (
            <Textarea
                size="sm"
                value={jsonDraft}
                onChange={(event) => onJsonDraftChange(event.target.value)}
                className="min-h-20 font-mono text-xs"
            />
        )
    }

    if (field.variant === 'Integer' || field.variant === 'Float') {
        return (
            <Input
                size="sm"
                type="number"
                value={String(field.initialValue)}
                placeholder="Initial value"
                onChange={(event) => {
                    const value = field.variant === 'Integer'
                        ? Number.parseInt(event.target.value || '0', 10)
                        : Number.parseFloat(event.target.value || '0')

                    onChange({ ...field, initialValue: Number.isFinite(value) ? value : 0 } as ConfigField)
                }}
            />
        )
    }

    return (
        <Input
            size="sm"
            value={field.initialValue}
            placeholder="Initial value"
            onChange={(event) => onChange({ ...field, initialValue: event.target.value } as ConfigField)}
        />
    )
}

function createField(
    variant: ConfigFieldVariant,
    id: Foundations.Field.Id,
    displayName: string,
): ConfigField {
    const base = {
        id,
        displayName,
        advanced: false,
        required: false,
        reconcile: false,
        description: '',
    }

    switch (variant) {
        case 'Boolean':
            return { ...base, variant, initialValue: false }
        case 'Integer':
            return { ...base, variant, initialValue: 0 }
        case 'Float':
            return { ...base, variant, initialValue: 0 }
        case 'Json':
            return { ...base, variant, initialValue: {} }
        case 'Secret':
            return { ...base, variant, initialValue: '' }
        case 'String':
        default:
            return { ...base, variant: 'String', initialValue: '', multiline: false }
    }
}

function createUniqueFieldId(fields: readonly ConfigField[]): Foundations.Field.Id {
    const existingIds = new Set(fields.map(field => field.id))
    let index = fields.length + 1
    let id = toFieldId(`field_${index}`)

    while (existingIds.has(id)) {
        index += 1
        id = toFieldId(`field_${index}`)
    }

    return id
}

function toFieldId(value: string): Foundations.Field.Id {
    return (value
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_:-]/g, '')
    ) as Foundations.Field.Id
}

function isConfigField(field: Foundations.Field): field is ConfigField {
    return FIELD_VARIANTS.includes(field.variant as ConfigFieldVariant)
}
