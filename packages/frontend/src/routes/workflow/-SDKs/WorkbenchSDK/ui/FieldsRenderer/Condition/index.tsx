import { memo, useEffect, useState } from 'react'
import { WorkbenchSDK } from '../../../sdk'
import { FieldLabel } from '../FieldLabel'
import type { RendererProps } from '../FieldLabel'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { Button, DropdownMenu, Input } from '@pretzel-graph/standard-ui/foundations'
import { WithExpression } from '../withExpression'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { OperatorSelector } from './OperatorSelector'

type RuleId = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id
type Value = Foundations.Field.Condition.Value

const useConditionValue = (
    nodeId: Workflow.Node.Id,
    fieldId: Foundations.Field.Id
) => WorkbenchSDK.useStore(s => s.selectors.field.condition.getValue(s, nodeId, fieldId))

const useConditionGroup = (
    nodeId: Workflow.Node.Id,
    fieldId: Foundations.Field.Id,
    ruleGroupId: RuleGroupId
) => WorkbenchSDK.useStore(s => s.selectors.field.condition.getGroup(s, nodeId, fieldId, ruleGroupId))

const useConditionRule = (
    nodeId: Workflow.Node.Id,
    fieldId: Foundations.Field.Id,
    ruleId: RuleId
) => WorkbenchSDK.useStore(s => s.selectors.field.condition.getRule(s, nodeId, fieldId, ruleId))

const useConditionChildKind = (
    nodeId: Workflow.Node.Id,
    fieldId: Foundations.Field.Id,
    id: RuleId | RuleGroupId
) => WorkbenchSDK.useStore(s => s.selectors.field.condition.getChildKind(s, nodeId, fieldId, id))

export const ConditionField = memo<RendererProps<'Condition'>>(({ field, nodeId, className }) => {
    const [root, , , , isReconciling] = WorkbenchSDK.useField<Value>(nodeId, field)

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            {root ? (
                <RuleGroup nodeId={nodeId} fieldId={field.id} ruleGroupId={"root" as RuleGroupId} />
            ) : (
                <div className='flex flex-col items-center justify-center text-sm text-neutral-500 py-4 border rounded-md border-border'>
                    No condition set
                </div>
            )}
        </div>
    )
})

export const RuleGroup = memo(({ nodeId, fieldId, ruleGroupId }: {
    nodeId: Workflow.Node.Id
    fieldId: Foundations.Field.Id
    ruleGroupId: RuleGroupId
}) => {
    const ruleGroup = useConditionGroup(nodeId, fieldId, ruleGroupId)

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
                            <DropdownMenu.CheckboxItem
                                checked={ruleGroup.combinator === "AND"}
                                onCheckedChange={() => WorkbenchSDK.actions.field.condition.changeCombinator(nodeId, fieldId, ruleGroupId, "AND")}
                            >
                                AND
                            </DropdownMenu.CheckboxItem>
                            <DropdownMenu.CheckboxItem
                                checked={ruleGroup.combinator === "OR"}
                                onCheckedChange={() => WorkbenchSDK.actions.field.condition.changeCombinator(nodeId, fieldId, ruleGroupId, "OR")}
                            >
                                OR
                            </DropdownMenu.CheckboxItem>
                        </DropdownMenu.Group>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Group>
                            <DropdownMenu.Label>Actions</DropdownMenu.Label>
                            <DropdownMenu.Item onSelect={() => WorkbenchSDK.actions.field.condition.addRule(nodeId, fieldId, ruleGroupId)}>
                                <SystemIcons.Terminal className='size-3 mr-2' /> Add Rule
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={() => WorkbenchSDK.actions.field.condition.addGroup(nodeId, fieldId, ruleGroupId)}>
                                <SystemIcons.Folder className='size-3 mr-2' /> Add Group
                            </DropdownMenu.Item>
                        </DropdownMenu.Group>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>
            <div className='flex flex-col gap-2 w-full'>
                {ruleGroup.children.map((id) => (
                    <ConditionChild key={id} nodeId={nodeId} fieldId={fieldId} id={id} parentGroupId={ruleGroupId} />
                ))}
            </div>
        </div>
    )
})
RuleGroup.displayName = "RuleGroup"

const ConditionChild = memo(({ nodeId, fieldId, id, parentGroupId }: {
    nodeId: Workflow.Node.Id
    fieldId: Foundations.Field.Id
    id: RuleId | RuleGroupId
    parentGroupId: RuleGroupId
}) => {
    const kind = useConditionChildKind(nodeId, fieldId, id)

    if (kind === 'rule')
        return <Rule nodeId={nodeId} fieldId={fieldId} ruleId={id as RuleId} parentGroupId={parentGroupId} />

    if (kind === 'group')
        return <RuleGroup nodeId={nodeId} fieldId={fieldId} ruleGroupId={id as RuleGroupId} />

    return null
})
ConditionChild.displayName = "ConditionChild"

export const DraggableRuleItem = ({ nodeId, fieldId, ruleId, parentGroupId }: {
    nodeId: Workflow.Node.Id
    fieldId: Foundations.Field.Id
    ruleId: RuleId
    parentGroupId: RuleGroupId
}) => {
    return (
        <div className='p-1 bg-secondary rounded-lg border-border border flex flex-row shadow-sm shadow-black/5'>
            <SystemIcons.GripVertical className='cursor-move w-5 px-1 h-auto my-auto' />
            <Rule nodeId={nodeId} fieldId={fieldId} ruleId={ruleId} parentGroupId={parentGroupId} />
        </div>
    )
}

const Rule = memo(({ nodeId, fieldId, ruleId, parentGroupId }: {
    nodeId: Workflow.Node.Id
    fieldId: Foundations.Field.Id
    ruleId: RuleId
    parentGroupId: RuleGroupId
}) => {
    const rule = useConditionRule(nodeId, fieldId, ruleId)
    const conditionRoot = useConditionValue(nodeId, fieldId)
    const [leftValue, setLeftValue] = useState(rule?.leftOperand ?? "")
    const [rightValue, setRightValue] = useState(rule?.rightOperand ?? "")

    useEffect(() => {
        setLeftValue(rule?.leftOperand ?? "")
    }, [rule?.leftOperand])

    useEffect(() => {
        setRightValue(rule?.rightOperand ?? "")
    }, [rule?.rightOperand])

    if (!rule || !conditionRoot)
        return null

    return (
        <div className='group/rule relative flex flex-col w-full border-border bg-input/80 rounded-sm shadow-md shadow-black/5 border'>
            <WithExpression
                value={leftValue}
                isExpression={rule.leftIsExpression ?? false}
                onToggleExpression={(value) => WorkbenchSDK.actions.field.condition.setLeftIsExpression(nodeId, fieldId, ruleId, value)}
                onChange={setLeftValue}
                onCommit={() => WorkbenchSDK.actions.field.condition.setLeftValue(nodeId, fieldId, ruleId, leftValue)}
                nodeId={nodeId}
                displayName='Left Operand'
                className='border-b border-b-border'
            >
                <Input
                    variant='ghost-no-focus'
                    size='xs'
                    className='rounded-none!'
                    value={leftValue}
                    onChange={(e) => setLeftValue(e.currentTarget.value)}
                    onBlur={() => WorkbenchSDK.actions.field.condition.setLeftValue(nodeId, fieldId, ruleId, leftValue)}
                />
            </WithExpression>
            <div className='flex flex-row w-full'>
                <OperatorSelector
                    operator={rule.operator}
                    dataType={rule.dataType}
                    onSelect={(operator, dataType) => WorkbenchSDK.actions.field.condition.setOperator(nodeId, fieldId, ruleId, operator, dataType)}
                />

                <div className='content-[" "] h-6 w-px bg-border' />

                <WithExpression
                    value={rightValue}
                    isExpression={rule.rightIsExpression ?? false}
                    onToggleExpression={(value) => WorkbenchSDK.actions.field.condition.setRightIsExpression(nodeId, fieldId, ruleId, value)}
                    onChange={setRightValue}
                    onCommit={() => WorkbenchSDK.actions.field.condition.setRightValue(nodeId, fieldId, ruleId, rightValue)}
                    nodeId={nodeId}
                    displayName='Right Operand'
                >
                    <Input
                        variant='ghost-no-focus'
                        size='xs'
                        className='rounded-none!'
                        value={rightValue}
                        onChange={(e) => setRightValue(e.currentTarget.value)}
                        onBlur={() => WorkbenchSDK.actions.field.condition.setRightValue(nodeId, fieldId, ruleId, rightValue)}
                    />
                </WithExpression>
            </div>

            <Button
                variant="destructive"
                size='icon-xs'
                className='scale-75 absolute top-0 right-0 opacity-0 group-hover/rule:opacity-100 transition-opacity'
                onClick={() => WorkbenchSDK.actions.field.condition.removeRuleOrGroup(nodeId, fieldId, ruleId, parentGroupId)}
            >
                <SystemIcons.X className='size-3' />
            </Button>
        </div>
    )
})
Rule.displayName = "Rule"
