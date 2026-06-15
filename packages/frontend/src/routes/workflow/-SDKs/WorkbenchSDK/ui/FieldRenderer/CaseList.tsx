import { memo, useEffect, useMemo, useState } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { ConditionContext, useConditionContext } from './Condition/context'
import { Button, DropdownMenu, Input, Label } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ExpressionInput } from './ExpressionInput'
import { OperatorSelector } from './Condition/OperatorSelector'

type Value = Foundations.Field.CaseList.Value
type PortId = Foundations.Port.Output.Id
type RuleId = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id

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
                    <CaseEntry key={portId} field={field} nodeId={nodeId} fieldId={field.id} portId={portId} index={index + 1} />
                ))}
            </div>
        </div>
    )
})
CaseListField.displayName = "CaseListField"

const CaseEntry = memo(({ field, nodeId, fieldId, portId, index }: {
    field: Foundations.Field.CaseList
    nodeId: Workflow.Node.Id
    fieldId: Foundations.Field.Id
    portId: PortId
    index: number
}) => {
    const entry = useCaseListEntry(nodeId, fieldId, portId)
    const [localLabel, setLocalLabel] = useState(entry?.label ?? "")

    useEffect(() => {
        setLocalLabel(entry?.label ?? "")
    }, [entry?.label])

    const entryActions = useMemo(() => ({
        setLeftValue: (ruleId: RuleId, value: string) =>
            WorkbenchSDK.actions.field.caseList.condition.setLeftValue(nodeId, fieldId, portId, ruleId, value),
        setRightValue: (ruleId: RuleId, value: string) =>
            WorkbenchSDK.actions.field.caseList.condition.setRightValue(nodeId, fieldId, portId, ruleId, value),
        setOperator: (ruleId: RuleId, op: Foundations.Field.Condition.Operator, dataType?: Foundations.Field.Condition.DataType) =>
            WorkbenchSDK.actions.field.caseList.condition.setOperator(nodeId, fieldId, portId, ruleId, op, dataType),
        addRule: (ruleGroupId: RuleGroupId) =>
            WorkbenchSDK.actions.field.caseList.condition.addRule(nodeId, fieldId, portId, ruleGroupId),
        addGroup: (parentGroupId: RuleGroupId) =>
            WorkbenchSDK.actions.field.caseList.condition.addGroup(nodeId, fieldId, portId, parentGroupId),
        removeRuleOrGroup: (id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) =>
            WorkbenchSDK.actions.field.caseList.condition.removeRuleOrGroup(nodeId, fieldId, portId, id, parentGroupId),
        changeCombinator: (ruleGroupId: RuleGroupId, combinator: "AND" | "OR") =>
            WorkbenchSDK.actions.field.caseList.condition.changeCombinator(nodeId, fieldId, portId, ruleGroupId, combinator),
    }), [fieldId, nodeId, portId])

    const contextValue = useMemo(() => {
        if (!entry) return null

        return {
            nodeId,
            field,
            root: entry.condition,
            actions: entryActions,
        }
    }, [entry, entryActions, field, nodeId])

    if (!entry || !contextValue)
        return null

    return (
        <div className='flex flex-col gap-2 rounded-md'>
            <div className='flex flex-row w-full'>
                <span className='text-xs font-medium text-muted-foreground'>Case {index}</span>
                <Button
                    variant='destructive'
                    size="xs"
                    className='ml-auto'
                    onClick={() => WorkbenchSDK.actions.field.caseList.removeEntry(nodeId, fieldId, portId)}
                >
                    Delete Case
                </Button>
            </div>
            <Label>Label</Label>
            <Input
                value={localLabel}
                onChange={e => setLocalLabel(e.target.value)}
                onBlur={() => {
                    if (localLabel !== entry.label)
                        WorkbenchSDK.actions.field.caseList.setLabel(nodeId, fieldId, portId, localLabel)
                }}
            />
            <ConditionContext.Provider value={contextValue}>
                <CaseEntryRuleGroup ruleGroupId={entry.condition.rootId} />
            </ConditionContext.Provider>
        </div>
    )
})
CaseEntry.displayName = "CaseEntry"

const CaseEntryRuleGroup = memo(({ ruleGroupId }: { ruleGroupId: RuleGroupId }) => {
    const { root, actions } = useConditionContext()
    const ruleGroup = root.groups[ruleGroupId]

    if (!ruleGroup)
        return null

    return (
        <div className='flex flex-row gap-2 relative'>
            <div className='relative w-6 border-l border-y border-border rounded-l-sm'>
                <DropdownMenu.Root modal={false}>
                    <DropdownMenu.Trigger className='absolute top-1/2 cursor-pointer -translate-y-1/2 -translate-x-1/2'>
                        <span className='font-semibold text-[11px] bg-input border-border rounded-[5px] px-0.5 py-px shadow-sm shadow-black/10'>{ruleGroup.combinator}</span>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content side='left' align='start'>
                        <DropdownMenu.Group>
                            <DropdownMenu.Label>Combinator</DropdownMenu.Label>
                            <DropdownMenu.CheckboxItem checked={ruleGroup.combinator === "AND"} onCheckedChange={() => actions.changeCombinator(ruleGroupId, "AND")}>
                                AND
                            </DropdownMenu.CheckboxItem>
                            <DropdownMenu.CheckboxItem checked={ruleGroup.combinator === "OR"} onCheckedChange={() => actions.changeCombinator(ruleGroupId, "OR")}>
                                OR
                            </DropdownMenu.CheckboxItem>
                        </DropdownMenu.Group>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Group>
                            <DropdownMenu.Label>Actions</DropdownMenu.Label>
                            <DropdownMenu.Item onSelect={() => actions.addRule(ruleGroupId)}>
                                <SystemIcons.Terminal className='size-3 mr-2' /> Add Rule
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={() => actions.addGroup(ruleGroupId)}>
                                <SystemIcons.Folder className='size-3 mr-2' /> Add Group
                            </DropdownMenu.Item>
                        </DropdownMenu.Group>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>
            <div className='flex flex-col gap-2 w-full'>
                {ruleGroup.children.map((id) => {
                    if (id in root.rules)
                        return <CaseEntryRule key={id} ruleId={id as RuleId} parentGroupId={ruleGroupId} />
                    if (id in root.groups)
                        return <CaseEntryRuleGroup key={id} ruleGroupId={id as RuleGroupId} />
                    return null
                })}
            </div>
        </div>
    )
})
CaseEntryRuleGroup.displayName = "CaseEntryRuleGroup"

const CaseEntryRule = memo(({ ruleId, parentGroupId }: {
    ruleId: RuleId
    parentGroupId: RuleGroupId
}) => {
    const { root, nodeId, actions } = useConditionContext()
    const rule = root.rules[ruleId]
    const [leftValue, setLeftValue] = useState(rule?.leftOperand ?? "")
    const [rightValue, setRightValue] = useState(rule?.rightOperand ?? "")

    useEffect(() => {
        setLeftValue(rule?.leftOperand ?? "")
    }, [rule?.leftOperand])

    useEffect(() => {
        setRightValue(rule?.rightOperand ?? "")
    }, [rule?.rightOperand])

    if (!rule)
        return null

    return (
        <div className='group/rule relative flex flex-col w-full border-border bg-input/80 rounded-sm shadow-md shadow-black/5 border'>
            <ExpressionInput
                value={leftValue}
                side='left'
                className='border-b border-b-border rounded-none!'
                onChange={setLeftValue}
                onCommit={(value) => actions.setLeftValue(ruleId, value)}
                nodeId={nodeId}
            />
            <div className='flex flex-row w-full'>
                <OperatorSelector
                    operator={rule.operator}
                    dataType={rule.dataType}
                    onSelect={(operator, dataType) => actions.setOperator(ruleId, operator, dataType)}
                />

                <div className='content-[" "] h-6 w-px bg-border' />

                <ExpressionInput
                    value={rightValue}
                    side='right'
                    className='rounded-none!'
                    onChange={setRightValue}
                    onCommit={(value) => actions.setRightValue(ruleId, value)}
                    nodeId={nodeId}
                />
            </div>

            <Button
                variant="destructive"
                size='icon-xs'
                className='scale-75 absolute top-0 right-0 opacity-0 group-hover/rule:opacity-100 transition-opacity'
                onClick={() => actions.removeRuleOrGroup(ruleId, parentGroupId)}
            >
                <SystemIcons.X className='size-3' />
            </Button>
        </div>
    )
})
CaseEntryRule.displayName = "CaseEntryRule"
