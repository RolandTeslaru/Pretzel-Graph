import { memo, useState, useMemo } from 'react'
import { WorkbenchSDK } from '../../../sdk'
import { FieldLabel } from '../FieldLabel'
import type { RendererProps } from '../FieldLabel'
import { Foundations } from '@vx-agent-editor/shared/domain'
import { Button, DropdownMenu } from '@vx-agent-editor/vx-ui/foundations'
import { ExpressionInput } from './ExpressionInput'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { conditionActions } from './actions'
import { OperatorSelector } from './OperatorSelector'
import { ConditionContext, useConditionContext } from './context'

type RuleId      = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id
type Value       = Foundations.Field.Condition.Value


export const ConditionField = memo<RendererProps<'Condition'>>(({ field, nodeId, className }) => {
    const [root, , isReconciling] = WorkbenchSDK.useField<Value>(nodeId, field.id)

    const ctx = useMemo(() => ({ nodeId, field, root: root! }), [nodeId, field, root])

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} isReconciling={isReconciling} />
            {root ?
                <ConditionContext.Provider value={ctx}>
                    <RuleGroup ruleGroupId={"root" as RuleGroupId} />
                </ConditionContext.Provider>
                :
                <div className='flex flex-col items-center justify-center text-sm text-neutral-500 py-4 border rounded-md border-border'>
                    No condition set
                </div>
            }
        </div>
    )
})


const RuleGroup = ({ ruleGroupId }: { ruleGroupId: RuleGroupId }) => {
    const { root, nodeId, field } = useConditionContext()
    const ruleGroup = root.groups[ruleGroupId]
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
                            <DropdownMenu.CheckboxItem checked={ruleGroup.combinator === "AND"} onCheckedChange={() => conditionActions.changeCombinator(nodeId, field, ruleGroupId, "AND")}>
                                AND
                            </DropdownMenu.CheckboxItem>
                            <DropdownMenu.CheckboxItem checked={ruleGroup.combinator === "OR"} onCheckedChange={() => conditionActions.changeCombinator(nodeId, field, ruleGroupId, "OR")}>
                                OR
                            </DropdownMenu.CheckboxItem>
                        </DropdownMenu.Group>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Group>
                            <DropdownMenu.Label>Actions</DropdownMenu.Label>
                            <DropdownMenu.Item onSelect={() => conditionActions.addRule(nodeId, field, ruleGroupId)}>
                                <SystemIcons.Terminal className='size-3 mr-2' /> Add Rule
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={() => conditionActions.addGroup(nodeId, field, ruleGroupId)}>
                                <SystemIcons.Folder className='size-3 mr-2' /> Add Group
                            </DropdownMenu.Item>
                        </DropdownMenu.Group>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>
            <div className='flex flex-col gap-2 w-full'>
                {ruleGroup.children.map((id) => {
                    if (id in root.rules)
                        return <Rule key={id} ruleId={id as RuleId} parentGroupId={ruleGroupId} />
                    else if (id in root.groups)
                        return <RuleGroup key={id} ruleGroupId={id as RuleGroupId} />
                    else
                        return null
                })}
            </div>
        </div>
    )
}

export const DraggableRuleItem = ({ ruleId, parentGroupId }: { ruleId: RuleId, parentGroupId: RuleGroupId }) => {
    return (
        <div className='p-1 bg-secondary rounded-lg border-border border flex flex-row shadow-sm shadow-black/5'>
            <SystemIcons.GripVertical className='cursor-move w-5 px-1 h-auto my-auto' />
            <Rule ruleId={ruleId} parentGroupId={parentGroupId} />
        </div>
    )
}

const Rule = ({ ruleId, parentGroupId }: { ruleId: RuleId, parentGroupId: RuleGroupId }) => {
    const { root, nodeId, field } = useConditionContext()
    const rule = root.rules[ruleId]

    const [leftValue, setLeftValue] = useState(rule.leftOperand)
    const [rightValue, setRightValue] = useState(rule.rightOperand ?? '')

    return (
        <div className='group/rule relative flex flex-col w-full border-border bg-input/80 rounded-sm shadow-md shadow-black/5 border'>
            <ExpressionInput
                value={leftValue}
                side='left'
                className='border-b border-b-border rounded-none!'
                onChange={setLeftValue}
                onCommit={(v) => conditionActions.setLeftValue(nodeId, field, ruleId, v)}
                nodeId={nodeId}
            />
            <div className='flex flex-row w-full'>
                <OperatorSelector
                    operator={rule.operator}
                    dataType={rule.dataType}
                    onSelect={(op, dt) => conditionActions.setOperator(nodeId, field, ruleId, op, dt)}
                />

                <div className='content-[" "] h-6 w-px bg-border' />

                <ExpressionInput
                    value={rightValue}
                    side='right'
                    className='rounded-none!'
                    onChange={setRightValue}
                    onCommit={(v) => conditionActions.setRightValue(nodeId, field, ruleId, v)}
                    nodeId={nodeId}
                />
            </div>

            <Button variant="destructive" size='icon-xs' className='scale-75 absolute top-0 right-0 opacity-0 group-hover/rule:opacity-100 transition-opacity'
                onClick={() => conditionActions.removeRuleOrGroup(nodeId, field, ruleId, parentGroupId)}
            >
                <SystemIcons.X className='size-3' />
            </Button>
        </div>
    )
}
