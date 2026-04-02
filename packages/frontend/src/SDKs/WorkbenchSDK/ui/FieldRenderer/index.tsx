import { memo } from 'react'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain'

import { StringField } from './String'
import { BooleanField } from './Boolean'
import { MultiOptionField } from './MultiOption'
import { IntegerField } from './Integer'
import { FloatField } from './Float'
import { FileField } from './File'
import { OtherField } from './Other'
import { SecretField } from './Secret'
import { ScriptField } from './Script'
import { ConditionField } from './Condition'
import { JsonField } from './Json'

export { FieldLabel } from './FieldLabel'
export type { RendererProps } from './FieldLabel'
export { StringField } from './String'
export { BooleanField } from './Boolean'
export { MultiOptionField } from './MultiOption'
export { IntegerField } from './Integer'
export { FloatField } from './Float'
export { FileField } from './File'
export { OtherField } from './Other'
export { SecretField } from './Secret'
export { ScriptField } from './Script'
export { ConditionField } from './Condition'
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
    Boolean: BooleanField,
    Integer: IntegerField,
    Float: FloatField,
    MultiOption: MultiOptionField,
    Secret: SecretField,
    File: FileField,
    Script: ScriptField,
    Json: JsonField,
    Condition: ConditionField,
}

/** Renders the appropriate field component based on variant */
export const FieldRenderer = memo(({ field, nodeId, className }: {
    field: Foundations.Field
    nodeId: Workflow.Node.Id
    className?: string
}) => {
    const Component = FIELD_RENDERER_MAP[field.variant] as React.ComponentType<{
        field: Foundations.Field
        nodeId: Workflow.Node.Id
        className?: string
    }> | undefined

    if (Component)
        return <Component field={field} nodeId={nodeId} className={className} />

    return <OtherField field={field} nodeId={nodeId} />
})
