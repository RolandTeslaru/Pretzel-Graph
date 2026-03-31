import { memo, useState } from 'react'
import { WorkbenchSDK } from '../../../sdk'
import { FieldLabel } from '../FieldLabel'
import type { RendererProps } from '../FieldLabel'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain'
import { Button, DropdownMenu, Input, Select } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { conditionActions } from './actions'
import { operatorLabel } from './utils'


export const ConditionField = memo<RendererProps<'Condition'>>(({ field, nodeId, className }) => {
    const [root] = WorkbenchSDK.useField<Foundations.Field.Condition.Value>(nodeId, field.id)

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} />
            {root ?
                <RuleGroup ruleGroupId={"root" as Foundations.Field.Condition.RuleGroup.Id} root={root} field={field} nodeId={nodeId} />
                :
                <div className='flex flex-col items-center justify-center text-sm text-neutral-500 py-4 border rounded-md border-border'>
                    No condition set
                </div>
            }
        </div>
    )
})


export const RuleGroup = ({ ruleGroupId, root, ...rest }: { ruleGroupId: Foundations.Field.Condition.RuleGroup.Id, root: Foundations.Field.Condition.Value, field: Foundations.Field, nodeId: Workflow.Node.Id }) => {
    const ruleGroup = root.groups[ruleGroupId];
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className='flex flex-row gap-2 relative'
            onMouseEnter={(e) => { e.stopPropagation(); setHovered(true); }}
            onMouseLeave={(e) => { e.stopPropagation(); setHovered(false); }}
        >
                <div className='relative w-6 border-l border-y border-border rounded-l-sm'>
                    <DropdownMenu.Root modal={false}>
                        <DropdownMenu.Trigger className='absolute top-1/2 cursor-pointer -translate-y-1/2  -translate-x-1/2'>
                            <span className='font-semibold text-[11px] bg-input border-border rounded-[5px] px-0.5 py-px shadow-sm shadow-black/10'>{ruleGroup.combinator}</span>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content side='left' align='start'>
                            <DropdownMenu.Group>
                                <DropdownMenu.Label>Combinator</DropdownMenu.Label>
                                <DropdownMenu.CheckboxItem checked={ruleGroup.combinator === "AND"} onCheckedChange={() => conditionActions.changeCombinator(rest.nodeId, rest.field, ruleGroupId, "AND")}>
                                    AND
                                </DropdownMenu.CheckboxItem>
                                <DropdownMenu.CheckboxItem checked={ruleGroup.combinator === "OR"} onCheckedChange={() => conditionActions.changeCombinator(rest.nodeId, rest.field, ruleGroupId, "OR")}>
                                    OR
                                </DropdownMenu.CheckboxItem>
                            </DropdownMenu.Group>
                            <DropdownMenu.Separator/>
                            <DropdownMenu.Group>
                                <DropdownMenu.Label>Actions</DropdownMenu.Label>
                                <DropdownMenu.Item onSelect={() => conditionActions.addRule(rest.nodeId, rest.field, ruleGroupId)}>
                                    <SystemIcons.Terminal className='size-3 mr-2' /> Add Rule
                                </DropdownMenu.Item>
                                <DropdownMenu.Item onSelect={() => conditionActions.addGroup(rest.nodeId, rest.field, ruleGroupId)}>
                                    <SystemIcons.Folder className='size-3 mr-2' /> Add Group
                                </DropdownMenu.Item>
                            </DropdownMenu.Group>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </div>
            <div className='flex flex-col gap-2 w-full'>
                {ruleGroup.children.map((id) => {
                    if (id in root.rules)
                        return <Rule key={id} parentGroupId={ruleGroupId} ruleId={id as Foundations.Field.Condition.Rule.Id} root={root} {...rest} />
                    else if (id in root.groups)
                        return <RuleGroup key={id} ruleGroupId={id as Foundations.Field.Condition.RuleGroup.Id} root={root} {...rest} />
                    else
                        return null;
                })}
            </div>
        </div>
    )
}

export const DraggableRuleItem = ({ ...rest }: { ruleId: Foundations.Field.Condition.Rule.Id, parentGroupId: Foundations.Field.Condition.RuleGroup.Id, root: Foundations.Field.Condition.Value, field: Foundations.Field, nodeId: Workflow.Node.Id }) => {
    return (
        <div className='p-1 bg-secondary rounded-lg border-border border flex flex-row shadow-sm shadow-black/5 '>
            <SystemIcons.GripVertical className='cursor-move w-5 px-1 h-auto my-auto' />
            <Rule {...rest} />
        </div>
    )
}

export const Rule = ({ ruleId, parentGroupId, root, field, nodeId }: { ruleId: Foundations.Field.Condition.Rule.Id, root: Foundations.Field.Condition.Value, parentGroupId: Foundations.Field.Condition.RuleGroup.Id, field: Foundations.Field, nodeId: Workflow.Node.Id }) => {
    const rule = root.rules[ruleId];
    return (
        <div className='group/rule relative flex flex-col w-full border-border bg-input/80 rounded-sm shadow-md shadow-black/5 border'>
            <Input
                value={rule.leftOperand}
                variant='ghost-no-focus' size="xs"
                className='border-b-border rounded-none!'
                onChange={(e) => {
                    conditionActions.setLeftValue(nodeId, field, ruleId, e.currentTarget.value)
                }}
            />
            <div className='flex flex-row w-full'>
                <Select.Root
                    value={rule.operator}
                    onValueChange={(newOp) => {
                        conditionActions.setOperator(nodeId, field, ruleId, newOp as Foundations.Field.Condition.Operator)
                    }}
                >
                    <Select.Trigger className={`w-37.5! font-semibold`} variant='ghost-no-focus' size="xs">
                        <Select.Value placeholder={"Select operator..."} />
                    </Select.Trigger>
                    <Select.Content size='xs'>
                        {Foundations.Field.Condition.Operator.String.options.map((op) => (
                            <Select.Item key={op} value={op} size="xs">
                                {operatorLabel(op)}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>

                <div className='content-[" "] h-6 w-px bg-border' />

                <Input
                    value={rule.rightOperand}
                    placeholder='' className='rounded-none!' variant='ghost-no-focus' size="xs"
                    onChange={(e) => {
                        conditionActions.setRightValue(nodeId, field, ruleId, e.currentTarget.value)
                    }}
                />
            </div>

            <Button variant="destructive" size='icon-xs' className='scale-75 absolute top-0 right-0 opacity-0 group-hover/rule:opacity-100 transition-opacity'
                onClick={() => {
                    conditionActions.removeRuleOrGroup(nodeId, field, ruleId, parentGroupId)
                }}
            >
                <SystemIcons.X className='size-3' />
            </Button>
        </div>
    )
}
