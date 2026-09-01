import { Label } from '@pretzel-graph/standard-ui/foundations/label'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain'

interface LabelProps {
    field: Foundations.Field
}

export const FieldLabel = ({ field }: LabelProps) => {
    return (
        <Label className="flex items-center" required={field.required}>
            {field.displayName}
        </Label>
    )
}

export type RendererProps<K extends Foundations.Field['variant']> = {
    field: Extract<Foundations.Field, { variant: K }>
    nodeId: Workflow.Node.Id
    className?: string
}
