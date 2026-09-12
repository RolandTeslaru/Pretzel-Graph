import type { Foundations } from "../../Foundations"
import type { GlobalFieldSpec, GlobalFieldVariant } from "./types"
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

// Global fields: the workflow's own inputs, shown when it runs as a sub-workflow node and read
// inside it as $globalFields.
export class GlobalFieldOperations {

    constructor(private readonly client: OperationalClient) {}

    public list(): readonly Foundations.Field[] {
        return this.client.document.data.globalFields
    }

    public add(spec: GlobalFieldSpec): { field: Foundations.Field } {
        const d = this.client.getDocument()

        if (d.data.globalFields.some(f => f.id === spec.id))
            throw new Error(`Global field ${spec.id} already exists`)

        const field = createGlobalField(spec)

        d.reducers.workflow.setGlobalFields(d, [...d.data.globalFields, field])
        this.client.report({ type: "workflow:globalFieldsChanged", globalFields: [...d.data.globalFields] })

        return { field }
    }

    public update(fieldId: Foundations.Field.Id, patch: Partial<Omit<GlobalFieldSpec, "id">>): { field: Foundations.Field } {
        const d       = this.client.getDocument()
        const current = d.data.globalFields.find(f => f.id === fieldId)

        if (!current)
            throw new Error(`Global field ${fieldId} not found`)

        // Rebuilt from the merged spec so a variant change starts from that variant's defaults.
        const field = createGlobalField({
            id:           fieldId,
            displayName:  patch.displayName  ?? current.displayName,
            variant:      patch.variant      ?? current.variant as GlobalFieldVariant,
            required:     patch.required     ?? current.required,
            tooltip:      patch.tooltip      ?? current.tooltip,
            initialValue: patch.initialValue ?? ("initialValue" in current ? current.initialValue as GlobalFieldSpec["initialValue"] : undefined),
            min:          patch.min          ?? ("min"       in current ? current.min       : undefined),
            max:          patch.max          ?? ("max"       in current ? current.max       : undefined),
            multiline:    patch.multiline    ?? ("multiline" in current ? current.multiline : undefined),
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
