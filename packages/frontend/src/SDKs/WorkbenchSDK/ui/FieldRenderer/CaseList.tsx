import { memo } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import type { Foundations } from '@vx-agent-editor/shared/domain'

type Entry = Foundations.CaseList.Entry

export const CaseListField = memo<RendererProps<'CaseList'>>(({ field, nodeId, className }) => {
    const [value, issue, isReconciling] = WorkbenchSDK.useField<Entry[]>(nodeId, field.id)
    const entries: Entry[] = value ?? []

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            {/* TODO: render entries list with label input + ConditionField per entry */}
            {/* TODO: add/remove entry buttons that also call portReducers.removeOutput / add output port */}
        </div>
    )
})
CaseListField.displayName = "CaseListField"
