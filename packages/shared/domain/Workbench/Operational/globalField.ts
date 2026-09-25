import type { Foundations } from "../../Foundations"
import { ID_PATTERN, type GlobalFieldPatch, type GlobalFieldSpec, type GlobalFieldVariant } from "./types"
import type { OperationalClient } from "."

// Only the scalar variants the settings panel offers; a spec is what a caller writes, a field
// is what the document stores.
const createGlobalField = (spec: GlobalFieldSpec): Foundations.Field => {
    const base = {
        id:          spec.id,
        displayName: spec.displayName,
        advanced:    false,
        required:    spec.required ?? false,
        reconcile:   false,
        description: "",
        tooltip:     spec.tooltip,
    }

    switch (spec.variant) {
        case "Boolean": return { ...base, variant: "Boolean", initialValue: Boolean(spec.initialValue ?? false) }
        case "Integer": return { ...base, variant: "Integer", initialValue: Math.trunc(Number(spec.initialValue ?? 0)), min: spec.min, max: spec.max }
        case "Float":   return { ...base, variant: "Float",   initialValue: Number(spec.initialValue ?? 0), min: spec.min, max: spec.max }
        case "String":  return { ...base, variant: "String",  initialValue: String(spec.initialValue ?? ""), multiline: spec.multiline ?? false }
    }
}

// Null clears, undefined keeps the current value.
const patched = <T>(value: T | null | undefined, current: T | undefined): T | undefined =>
    value === null ? undefined : value ?? current

// Global fields: the workflow's own inputs, shown when it runs as a sub-workflow node and read
// inside it as $globalFields.
export class GlobalFieldOperations {

    constructor(private readonly client: OperationalClient) {}

    public list(): readonly Foundations.Field[] {
        return this.client.document.data.globalFields
    }

    public add(spec: GlobalFieldSpec): { field: Foundations.Field } {
        const d = this.client.getDocument()

        if (!ID_PATTERN.test(spec.id))
            throw new Error(`Global field id ${spec.id} may only contain letters, digits and underscores`)

        if (d.data.globalFields.some(f => f.id === spec.id))
            throw new Error(`Global field ${spec.id} already exists`)

        const field = createGlobalField(spec)

        d.reducers.workflow.setGlobalFields(d, [...d.data.globalFields, field])
        this.client.report({ type: "workflow:globalFieldsChanged", globalFields: [...d.data.globalFields] })

        return { field }
    }

    public update(fieldId: Foundations.Field.Id, patch: GlobalFieldPatch): { field: Foundations.Field } {
        const d       = this.client.getDocument()
        const current = d.data.globalFields.find(f => f.id === fieldId)

        if (!current)
            throw new Error(`Global field ${fieldId} not found`)

        const variant = patch.variant ?? current.variant as GlobalFieldVariant
        const kept    = variant === current.variant ? current : null

        // A kind change keeps only name, required and tooltip; the rest start from the new kind's defaults.
        const field = createGlobalField({
            id:           fieldId,
            displayName:  patch.displayName ?? current.displayName,
            variant,
            required:     patch.required ?? current.required,
            tooltip:      patched(patch.tooltip, current.tooltip),
            initialValue: patch.initialValue ?? (kept && "initialValue" in kept ? kept.initialValue as GlobalFieldSpec["initialValue"] : undefined),
            min:          patched(patch.min, kept && "min" in kept ? kept.min : undefined),
            max:          patched(patch.max, kept && "max" in kept ? kept.max : undefined),
            multiline:    patch.multiline ?? (kept && "multiline" in kept ? kept.multiline : undefined),
        })

        d.reducers.workflow.setGlobalFields(d, d.data.globalFields.map(f => f.id === fieldId ? field : f))
        this.client.report({ type: "workflow:globalFieldsChanged", globalFields: [...d.data.globalFields] })

        return { field }
    }

    public remove(fieldId: Foundations.Field.Id): { fieldId: Foundations.Field.Id } {
        const d = this.client.getDocument()

        if (!d.data.globalFields.some(f => f.id === fieldId))
            throw new Error(`Global field ${fieldId} not found`)

        d.reducers.workflow.setGlobalFields(d, d.data.globalFields.filter(f => f.id !== fieldId))
        this.client.report({ type: "workflow:globalFieldsChanged", globalFields: [...d.data.globalFields] })

        return { fieldId }
    }
}
