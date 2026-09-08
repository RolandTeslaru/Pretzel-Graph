import React, { useMemo, useState } from 'react'
import { Button, Checkbox, Input, Select, Switch } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Foundations } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../sdk'
import { toast } from 'sonner'

type GlobalFieldVariant = 'String' | 'Boolean' | 'Integer' | 'Float'
type GlobalField = Extract<Foundations.Field, { variant: GlobalFieldVariant }>

const FIELD_VARIANTS: GlobalFieldVariant[] = ['String', 'Boolean', 'Integer', 'Float']

export const GlobalFieldsSettings = () => {
    const workflowFields = WorkbenchSDK.useDocument(d => d.data.globalFields ?? [])
    const [fields, setFields] = useState<GlobalField[]>(() => workflowFields.filter(isGlobalField))

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
        setFields(current => [...current, createField('String', id, 'Global field')])
    }

    const updateField = (index: number, next: GlobalField) => {
        setFields(current => current.map((field, i) => i === index ? next : field))
    }

    const updateVariant = (index: number, variant: GlobalFieldVariant) => {
        const current = fields[index]
        const next = createField(variant, current.id, current.displayName)
        next.required = current.required
        next.description = current.description
        next.tooltip = current.tooltip
        updateField(index, next)
    }

    const updateId = (index: number, id: string) => {
        updateField(index, { ...fields[index], id: toFieldId(id) } as GlobalField)
    }

    const removeField = (index: number) => {
        setFields(current => current.filter((_, i) => i !== index))
    }

    const save = () => {
        if (hasDuplicateIds) {
            toast.error('Field ids must be unique')
            return
        }
        for (const field of fields) {
            if (!field.id.trim()) {
                toast.error('Field ids are required')
                return
            }
        }
        WorkbenchSDK.actions.workflow.setGlobalFields(fields)
        toast.success('Global fields updated')
    }

    return (
        <>
            <div className='p-0.5 bg-card rounded-full absolute top-2 right-2 z-100 border border-border shadow-lg shadow-black/10 gap-1 inline-flex'>
                <Button variant="ghost" size="icon-sm" className='rounded-full' onClick={addField}>
                    <SystemIcons.Plus className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" className='rounded-full' onClick={save} disabled={hasDuplicateIds}>
                    <SystemIcons.Save className="size-4" />
                </Button>
            </div>
            <div className="flex flex-col gap-4">
                {fields.length === 0 ? (
                    <div className="absolute top-1/2 -translate-y-1/2 w-full text-center text-sm text-muted-foreground">
                        No global fields configured
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {fields.map((field, index) => (
                            <FieldEditor
                                key={index}
                                field={field}
                                index={index}
                                onChange={(next) => updateField(index, next)}
                                onIdChange={(id) => updateId(index, id)}
                                onVariantChange={(variant) => updateVariant(index, variant)}
                                onRemove={() => removeField(index)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}

interface FieldEditorProps {
    field: GlobalField
    index: number
    onChange: (field: GlobalField) => void
    onIdChange: (id: string) => void
    onVariantChange: (variant: GlobalFieldVariant) => void
    onRemove: () => void
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[100px_1fr] items-center gap-2 h-8">
            <span className="text-xs text-muted-foreground">{label}</span>
            {children}
        </div>
    )
}

function FieldEditor({ field, index, onChange, onIdChange, onVariantChange, onRemove }: FieldEditorProps) {
    return (
        <div className="rounded-md border border-border/50 bg-card/50 p-2 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Field {index + 1}</span>
                <Button type="button" variant="ghost-destructive" size="icon-sm" onClick={onRemove}>
                    <SystemIcons.Trash className="size-3.5" />
                </Button>
            </div>

            <FieldRow label="Display name">
                <Input size="sm" value={field.displayName} placeholder="My Field" onChange={(e) => onChange({ ...field, displayName: e.target.value } as GlobalField)} />
            </FieldRow>

            <FieldRow label="ID">
                <Input size="sm" value={field.id} placeholder="field_id" onChange={(e) => onIdChange(e.target.value)} />
            </FieldRow>

            <FieldRow label="Type">
                <Select.Root value={field.variant} onValueChange={(v) => onVariantChange(v as GlobalFieldVariant)}>
                    <Select.Trigger size="sm"><Select.Value /></Select.Trigger>
                    <Select.Content>
                        {FIELD_VARIANTS.map(v => <Select.Item key={v} value={v}>{v}</Select.Item>)}
                    </Select.Content>
                </Select.Root>
            </FieldRow>

            <FieldRow label="Initial value">
                <InitialValueEditor field={field} onChange={onChange} />
            </FieldRow>

            {(field.variant === 'Integer' || field.variant === 'Float') && (
                <FieldRow label="Min / Max">
                    <div className="flex gap-2">
                        <Input
                            size="sm"
                            type="number"
                            placeholder="min"
                            value={field.min ?? ''}
                            onChange={(e) => onChange({ ...field, min: parseBound(field.variant, e.target.value) } as GlobalField)}
                        />
                        <Input
                            size="sm"
                            type="number"
                            placeholder="max"
                            value={field.max ?? ''}
                            onChange={(e) => onChange({ ...field, max: parseBound(field.variant, e.target.value) } as GlobalField)}
                        />
                    </div>
                </FieldRow>
            )}

            <FieldRow label="Required">
                <Checkbox
                    className='ml-auto'
                    checked={field.required}
                    onCheckedChange={(required) => onChange({ ...field, required: !!required } as GlobalField)}
                />
            </FieldRow>
        </div>
    )
}

function InitialValueEditor({ field, onChange }: { field: GlobalField; onChange: (field: GlobalField) => void }) {
    if (field.variant === 'Boolean') {
        return (
            <Switch className="ml-auto" checked={field.initialValue} onCheckedChange={(initialValue) => onChange({ ...field, initialValue })} />
        )
    }

    if (field.variant === 'Integer' || field.variant === 'Float') {
        return (
            <Input
                size="sm"
                type="number"
                min={field.min}
                max={field.max}
                value={String(field.initialValue)}
                placeholder="Initial value"
                onChange={(e) => {
                    const parsed = field.variant === 'Integer'
                        ? Number.parseInt(e.target.value || '0', 10)
                        : Number.parseFloat(e.target.value || '0')
                    const value = clamp(Number.isFinite(parsed) ? parsed : 0, field.min, field.max)
                    onChange({ ...field, initialValue: value } as GlobalField)
                }}
            />
        )
    }

    return (
        <Input
            size="sm"
            value={field.initialValue}
            placeholder="Initial value"
            onChange={(e) => onChange({ ...field, initialValue: e.target.value } as GlobalField)}
        />
    )
}

function parseBound(variant: 'Integer' | 'Float', raw: string): number | undefined {
    if (raw === '') return undefined
    const value = variant === 'Integer' ? Number.parseInt(raw, 10) : Number.parseFloat(raw)
    return Number.isFinite(value) ? value : undefined
}

function clamp(value: number, min?: number, max?: number): number {
    if (min !== undefined && value < min) return min
    if (max !== undefined && value > max) return max
    return value
}

function createField(variant: GlobalFieldVariant, id: Foundations.Field.Id, displayName: string): GlobalField {
    const base = { id, displayName, advanced: false, required: false, reconcile: false, description: '' }
    switch (variant) {
        case 'Boolean': return { ...base, variant, initialValue: false }
        case 'Integer': return { ...base, variant, initialValue: 0 }
        case 'Float':   return { ...base, variant, initialValue: 0 }
        case 'String':
        default:        return { ...base, variant: 'String', initialValue: '', multiline: false }
    }
}

function createUniqueFieldId(fields: readonly GlobalField[]): Foundations.Field.Id {
    const existing = new Set(fields.map(f => f.id))
    let index = fields.length + 1
    let id = toFieldId(`field_${index}`)
    while (existing.has(id)) { index++; id = toFieldId(`field_${index}`) }
    return id
}

function toFieldId(value: string): Foundations.Field.Id {
    return value.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_:-]/g, '') as Foundations.Field.Id
}

function isGlobalField(field: Foundations.Field): field is GlobalField {
    return FIELD_VARIANTS.includes(field.variant as GlobalFieldVariant)
}
