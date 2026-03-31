import { Label } from '@vx-agent-editor/vx-ui/foundations/label'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain'

interface LabelProps {
    field: Foundations.Field
}

export const FieldLabel = ({ field }: LabelProps) => {
    return (
        <Label className="text-sm font-medium flex items-center">
            {field.displayName}
            {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
    )
}

export type RendererProps<K extends Foundations.Field['variant']> = {
    field: Extract<Foundations.Field, { variant: K }>
    nodeId: Workflow.Node.Id
    className?: string
}
