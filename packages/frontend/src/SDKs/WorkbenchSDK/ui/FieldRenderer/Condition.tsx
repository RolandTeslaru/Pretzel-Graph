import { memo } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { FieldLabel } from './FieldLabel'
import type { RendererProps } from './FieldLabel'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain'
import { Button, Input, Select } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { OrchestratorSDK } from '@/SDKs/OrchestratorSDK/sdk'



export const ConditionField = memo<RendererProps<'Condition'>>(({ field, nodeId, className }) => {
    const [root] = WorkbenchSDK.useField<Foundations.Field.Condition.Value>(nodeId, field.id)

    return (
        <div className={className + " w-full nodrag cursor-auto flex flex-col gap-1"}>
            <FieldLabel field={field} />
            {root ?
                <RuleGroup ruleGroupId={"root" as Foundations.Field.Condition.RuleGroup.Id} root={root} field={field} nodeId={nodeId}/>
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
    return (
        <div className='flex flex-row gap-2'>
            <div className='relative w-4 border-l border-y border-border rounded-sm'>
                <span className='absolute top-1/2 -translate-y-1/2 font-semibold text-[11px] bg-input border-border rounded-[5px] px-0.5 py-[1px] shadow-sm shadow-black/10 -translate-x-1/2'>{ruleGroup.combinator}</span>
            </div>
            <div className='flex flex-col gap-2'>
                {ruleGroup.children.map((id) => {
                    if (id in root.rules)
                        return <Rule key={id} ruleId={id as Foundations.Field.Condition.Rule.Id} root={root} {...rest}/>
                    else if (id in root.groups)
                        return <RuleGroup key={id} ruleGroupId={id as Foundations.Field.Condition.RuleGroup.Id} root={root} {...rest}/>
                    else
                        return null;
                })}
            </div>
        </div>
    )
}

export const DraggableRuleItem = ({ ...rest }: { ruleId: Foundations.Field.Condition.Rule.Id, root: Foundations.Field.Condition.Value, field: Foundations.Field, nodeId: Workflow.Node.Id }) => {
    return (
        <div className='p-1 bg-secondary rounded-lg border-border border flex flex-row shadow-sm shadow-black/5 '>
            <SystemIcons.GripVertical className='cursor-move w-5 px-1 h-auto my-auto'/>
            <Rule {...rest}/>
        </div>
    )
}



export const Rule = ({ ruleId, root, field, nodeId }: { ruleId: Foundations.Field.Condition.Rule.Id, root: Foundations.Field.Condition.Value, field: Foundations.Field, nodeId: Workflow.Node.Id }) => {
    const rule = root.rules[ruleId];
    return (
        <div className='flex flex-col w-full border-border bg-input/80 rounded-sm shadow-md shadow-black/5 border'>
            <Input 
                value={rule.leftOperand} 
                variant='ghost-no-focus' size="xs" 
                className='border-b-border rounded-none!'
                onChange={(e) => {
                    WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Foundations.Field.Condition.Rule) => {
                        prev.leftOperand = e.currentTarget.value
                        return prev;
                    })
                }}
            />
            <div className='flex flex-row w-full'>
                <Select.Root value={rule.operator} onValueChange={(newOp) => {

                }} >
                    <Select.Trigger className={`!w-[150px] font-semibold`} variant='ghost-no-focus' size="xs">
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

                <div className='content-[" "] h-6 w-[1px] bg-border'/>
                
                <Input 
                    value={rule.rightOperand} 
                    placeholder='' className='rounded-none!' variant='ghost-no-focus' size="xs"
                    onChange={(e) => {
                        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Foundations.Field.Condition.Rule) => {
                        prev.rightOperand = e.currentTarget.value
                        return prev;
                        })
                    }}
                />
            </div>
        </div>
    )
}






const operatorLabel = (op: Foundations.Field.Condition.Operator): string => {
    const labels: Record<string, string> = {
        exists: "exists",
        not_exists: "does not exist",
        is_empty: "is empty",
        is_not_empty: "is not empty",
        equals: "equals",
        not_equals: "not equals",
        contains: "contains",
        not_contains: "does not contain",
        starts_with: "starts with",
        not_starts_with: "does not start with",
        ends_with: "ends with",
        not_ends_with: "does not end with",
        matches_regex: "matches regex",
        not_matches_regex: "does not match regex",
        greater_than: "greater than",
        less_than: "less than",
        greater_than_or_equal: "≥",
        less_than_or_equal: "≤",
        after: "is after",
        before: "is before",
        after_or_equal: "is after or equal",
        before_or_equal: "is before or equal",
        is_true: "is true",
        is_false: "is false",
        length_equals: "length equals",
        length_not_equals: "length not equals",
        length_greater_than: "length greater than",
        length_less_than: "length less than",
        length_greater_than_or_equal: "length ≥",
        length_less_than_or_equal: "length ≤",
    }
    return labels[op] ?? op
}
