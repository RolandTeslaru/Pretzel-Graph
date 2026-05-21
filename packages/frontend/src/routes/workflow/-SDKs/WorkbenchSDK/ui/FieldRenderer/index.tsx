import { memo } from 'react'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain'

import { StringField } from './String'
import { BooleanField } from './Boolean'
import { MultiOptionField } from './MultiOption'
import { IntegerField } from './Integer'
import { FloatField } from './Float'
import { FileField } from './File'
import { OtherField } from './Other'
import { ScriptField } from './Script'
import { ConditionField } from './Condition'
import { CaseListField } from './CaseList'
import { JsonField } from './Json'
import { VariadicField } from './Variadic'

export { FieldLabel } from './FieldLabel'
export type { RendererProps } from './FieldLabel'
export { StringField } from './String'
export { BooleanField } from './Boolean'
export { MultiOptionField } from './MultiOption'
export { IntegerField } from './Integer'
export { FloatField } from './Float'
export { FileField } from './File'
export { OtherField } from './Other'
export { ScriptField } from './Script'
export { ConditionField } from './Condition'
export { CaseListField } from './CaseList'
export { JsonField } from './Json'

// ── Dispatcher ──────────────────────────────────────────────

type FieldRendererMapType = {
    [K in Foundations.Field['variant']]?:
    React.ComponentType<{
        field: Extract<Foundations.Field, { variant: K }>
        nodeId: Workflow.Node.Id
        className?: string
    }>
}

export const FIELD_RENDERER_MAP: FieldRendererMapType = {
    String: StringField,
    UniqueString: StringField as any,
    Boolean: BooleanField,
    Integer: IntegerField,
    Float: FloatField,
    MultiOption: MultiOptionField,
    File: FileField,
    Script: ScriptField,
    Json: JsonField,
    Condition: ConditionField,
    CaseList: CaseListField,
    Variadic: VariadicField,
}

/** Renders the appropriate field component based on variant */
export const FieldRenderer = memo(({ field, nodeId, className }: {
    field: Foundations.Field
    nodeId: Workflow.Node.Id
    className?: string
}) => {
    if(!field)
        return null;
    
    const Component = FIELD_RENDERER_MAP[field.variant] as React.ComponentType<{
        field: Foundations.Field
        nodeId: Workflow.Node.Id
        className?: string
    }> | undefined

    if (Component)
        return <Component field={field} nodeId={nodeId} className={className} />

    return <OtherField field={field} nodeId={nodeId} />
})
