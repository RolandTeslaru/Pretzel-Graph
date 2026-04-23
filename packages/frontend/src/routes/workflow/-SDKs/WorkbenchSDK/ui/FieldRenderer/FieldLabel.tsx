import { Label } from '@pretzel-graph/vx-ui/foundations/label'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { Spinner } from '@pretzel-graph/vx-ui/foundations'

interface LabelProps {
    field: Foundations.Field
    isReconciling: boolean
}

export const FieldLabel = ({ field, isReconciling }: LabelProps) => {
    return (
        <Label className="flex items-center" required={field.required}>
            {field.displayName}
            {isReconciling && <Spinner className='h-4 pl-2'/>}
        </Label>
    )
}

export type RendererProps<K extends Foundations.Field['variant']> = {
    field: Extract<Foundations.Field, { variant: K }>
    nodeId: Workflow.Node.Id
    className?: string
}
