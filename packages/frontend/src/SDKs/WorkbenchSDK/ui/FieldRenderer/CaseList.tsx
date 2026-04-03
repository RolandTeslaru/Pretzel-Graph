import { memo, useMemo } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain'
import { conditionReducers } from './Condition/actions'
import { ConditionContext } from './Condition/context'
import { RuleGroup } from './Condition'
import { Button, Input } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { Label } from '@vx-agent-editor/vx-ui/foundations'

type Entry       = Foundations.Field.CaseList.Entry
type Value       = Foundations.Field.CaseList.Value
type RuleId      = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id
type Operator    = Foundations.Field.Condition.Operator
type DataType    = Foundations.Field.Condition.DataType

const setValue = WorkbenchSDK.actions.field.setValue

export const createCaseEntry = (nodeId: Workflow.Node.Id, field: Foundations.Field, label: string) => {
    const portId = Foundations.Port.Output.Id.parse(crypto.randomUUID())
    const entry  = Foundations.Field.CaseList.createEntry(portId, label)
    setValue(nodeId, field, (prev: Value) => [...prev, entry])
    WorkbenchSDK.actions.port.addOutput(nodeId, {
        id: portId,
        displayName: label,
        variant: "Unresolved",
        isDynamic: true,
        syncGroupId: "condition",
        unresolvedVariant: "Unresolved",
    })
}

const bindEntryActions = (nodeId: Workflow.Node.Id, field: Foundations.Field, portId: string) => {
    const patch = (updater: (entry: Entry) => void) =>
        setValue(nodeId, field, (prev: Value) => {
            const entry = prev.find(e => e.portId === portId)
            if (entry) updater(entry)
            return prev
        })

    return {
        setLeftValue     : (ruleId: RuleId, value: string)                        => patch(e => conditionReducers.setLeftValue(e.condition, ruleId, value)),
        setRightValue    : (ruleId: RuleId, value: string)                        => patch(e => conditionReducers.setRightValue(e.condition, ruleId, value)),
        setOperator      : (ruleId: RuleId, op: Operator, dt?: DataType)          => patch(e => conditionReducers.setOperator(e.condition, ruleId, op, dt)),
        addRule          : (ruleGroupId: RuleGroupId)                             => patch(e => conditionReducers.addRule(e.condition, ruleGroupId)),
        addGroup         : (parentGroupId: RuleGroupId)                           => patch(e => conditionReducers.addGroup(e.condition, parentGroupId)),
        removeRuleOrGroup: (id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) => patch(e => conditionReducers.removeRuleOrGroup(e.condition, id, parentGroupId)),
        changeCombinator : (ruleGroupId: RuleGroupId, combinator: "AND" | "OR")   => patch(e => conditionReducers.changeCombinator(e.condition, ruleGroupId, combinator)),
        setLabel         : (label: string) => {
            patch(e => { e.label = label })
            WorkbenchSDK.actions.port.setOutputDisplayName(nodeId, portId as Foundations.Port.Output.Id, label)
        },
        remove           : () => {
            setValue(nodeId, field, (prev: Value) => prev.filter(e => e.portId !== portId))
            WorkbenchSDK.actions.port.removeOutput(nodeId, portId as Foundations.Port.Output.Id)
        },
    }
}

export const CaseListField = memo<RendererProps<'CaseList'>>(({ field, nodeId, className }) => {
    const [value, , isReconciling] = WorkbenchSDK.useField<Value>(nodeId, field.id)
    const entries: Entry[] = value ?? []

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <div className='flex flex-row w-full'>
                <FieldLabel field={field} isReconciling={isReconciling} />

                <Button variant='outline' size="xs" className='ml-auto' onClick={() => createCaseEntry(nodeId, field, `Case ${entries.length + 1}`)}>
                    <SystemIcons.Plus className='size-3' /> Add Case
                </Button>
            </div>
            <div className='flex flex-col gap-3 pt-2'>
                {entries.map(entry => (
                    <CaseEntry key={entry.portId} entry={entry} field={field} nodeId={nodeId} />
                ))}
            </div>
            {/* TODO: add/remove entry buttons that also call portReducers.removeOutput / add output port */}
        </div>
    )
})
CaseListField.displayName = "CaseListField"

interface EntryProps {
    entry: Entry
    field: Foundations.Field
    nodeId: Workflow.Node.Id
}

const CaseEntry = ({ entry, field, nodeId }: EntryProps) => {
    const entryActions = useMemo(() => bindEntryActions(nodeId, field, entry.portId), [nodeId, field, entry.portId])

    const ctx = useMemo(() => ({
        nodeId,
        field,
        root: entry.condition,
        actions: entryActions,
    }), [nodeId, field, entry.condition, entryActions])

    return (
        <div className='flex flex-col gap-2 rounded-md'>
            <div className='flex flex-row w-full'>
                <span className='text-xs font-medium text-muted-foreground'>{entry.label}</span>
                <Button variant='destructive' size="xs" className='ml-auto' onClick={entryActions.remove}>
                    Delete Case
                </Button>
            </div>
            <Label>Label</Label>
            <Input value={entry.label} onChange={e => entryActions.setLabel(e.target.value)} />
            <ConditionContext.Provider value={ctx}>
                <RuleGroup ruleGroupId={entry.condition.rootId} />
            </ConditionContext.Provider>
        </div>
    )
}
