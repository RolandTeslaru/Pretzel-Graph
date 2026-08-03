import { memo, useEffect, useMemo, useState } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { Button, Input, Label } from '@pretzel-graph/standard-ui/foundations'
import { Switch } from '@pretzel-graph/standard-ui/foundations/switch'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { WithExpression } from './withExpression'

type Value = Foundations.Field.CaseList.Value
type PortId = Foundations.Port.Output.Id

const useCaseListValue = (
    nodeId: Workflow.Node.Id,
    fieldId: Foundations.Field.Id
) => WorkbenchSDK.useStore(s => s.selectors.field.caseList.getValue(s, nodeId, fieldId) ?? [])

const useCaseListEntry = (
    nodeId: Workflow.Node.Id,
    fieldId: Foundations.Field.Id,
    portId: PortId
) => WorkbenchSDK.useStore(s => s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId))

export const CaseListField = memo<RendererProps<'CaseList'>>(({ field, nodeId, className }) => {
    const entries = useCaseListValue(nodeId, field.id)
    const [, , , , isReconciling] = WorkbenchSDK.useField<Value>(nodeId, field)
    const portIds = useMemo(() => entries.map(entry => entry.portId), [entries])

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <div className='flex flex-row w-full'>
                <FieldLabel field={field} isReconciling={isReconciling} />

                <Button
                    variant='outline'
                    size="xs"
                    className='ml-auto'
                    onClick={() => WorkbenchSDK.actions.field.caseList.addEntry(nodeId, field.id, `Case ${portIds.length + 1}`)}
                >
                    <SystemIcons.Plus className='size-3' /> Add Case
                </Button>
            </div>
            <div className='flex flex-col gap-3 pt-2'>
                {portIds.map((portId, index) => (
                    <CaseEntry key={portId} nodeId={nodeId} fieldId={field.id} portId={portId} index={index + 1} />
                ))}
            </div>
        </div>
    )
})
CaseListField.displayName = "CaseListField"

const formatDraft = (value: Foundations.Field.CaseList.Entry["value"] | undefined) =>
    typeof value === "string" ? value : String(value ?? false)

const CaseEntry = memo(({ nodeId, fieldId, portId, index }: {
    nodeId: Workflow.Node.Id
    fieldId: Foundations.Field.Id
    portId: PortId
    index: number
}) => {
    const entry = useCaseListEntry(nodeId, fieldId, portId)
    const [localLabel, setLocalLabel] = useState(entry?.label ?? "")
    const [draft, setDraft] = useState(() => formatDraft(entry?.value))

    useEffect(() => {
        setLocalLabel(entry?.label ?? "")
    }, [entry?.label])

    useEffect(() => {
        setDraft(formatDraft(entry?.value))
    }, [entry?.value])

    if (!entry)
        return null

    const isExpression = entry.isExpression ?? false

    return (
        <div className='flex flex-col gap-2 rounded-md'>
            {/* <Label>Label</Label>
            <Input
            value={localLabel}
            onChange={e => setLocalLabel(e.target.value)}
            onBlur={() => {
                if (localLabel !== entry.label)
                WorkbenchSDK.actions.field.caseList.setLabel(nodeId, fieldId, portId, localLabel)
                }}
                /> */}
            {/* <Label>Condition</Label> */}
            <WithExpression
                value={draft}
                isExpression={isExpression}
                onToggleExpression={(value) => WorkbenchSDK.actions.field.caseList.setIsExpression(nodeId, fieldId, portId, value)}
                onChange={setDraft}
                onCommit={() => WorkbenchSDK.actions.field.caseList.setValue(nodeId, fieldId, portId, draft)}
                nodeId={nodeId}
                displayName='Condition'
            >
                <div className='flex flex-row w-full'>
                    <span className='text-xs my-auto font-medium text-muted-foreground'>Case {index}</span>
                </div>
                <div className='flex flex-row gap-2'>
                    <Button
                        variant='ghost-destructive'
                        size="icon-xs"
                        className='p-1!'
                        onClick={() => WorkbenchSDK.actions.field.caseList.removeEntry(nodeId, fieldId, portId)}
                    >
                        <SystemIcons.Trash className='size-3!' />
                    </Button>
                    {isExpression ? (
                        <WithExpression.Input />
                    ) : (
                        <Switch
                            checked={draft === "true"}
                            size="lg"
                            onCheckedChange={(checked) => {
                                setDraft(String(checked))
                                WorkbenchSDK.actions.field.caseList.setValue(nodeId, fieldId, portId, checked)
                            }}
                        />
                    )}
                </div>
            </WithExpression>
        </div>
    )
})
CaseEntry.displayName = "CaseEntry"
