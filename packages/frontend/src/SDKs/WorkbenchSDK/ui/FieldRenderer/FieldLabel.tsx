import { Label } from '@vx-agent-editor/vx-ui/foundations/label'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain'
import { Spinner } from '@vx-agent-editor/vx-ui/foundations'

interface LabelProps {
    field: Foundations.Field
    isReconciling: boolean
}

export const FieldLabel = ({ field, isReconciling }: LabelProps) => {
    return (
        <Label className="text-sm font-medium flex items-center">
            {field.displayName}
            {field.required && <span className="text-red-500 ml-1">*</span>}
            {isReconciling && <Spinner className='h-4 pl-2'/>}
        </Label>
    )
}

export type RendererProps<K extends Foundations.Field['variant']> = {
    field: Extract<Foundations.Field, { variant: K }>
    nodeId: Workflow.Node.Id
    className?: string
}
