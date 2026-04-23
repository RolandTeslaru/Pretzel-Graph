import { ExecutionSessionSDK } from '@/routes/workflow/-SDKs/ExecutionSessionSDK/sdk'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { Expression, Workflow } from '@pretzel-graph/shared/domain'
import { Input, Tooltip } from '@pretzel-graph/standard-ui/foundations'
import { cn } from '@pretzel-graph/standard-ui/utils/cn'
import { useState, useEffect } from 'react'
import JsonView from 'react18-json-view'

interface Props {
    value: string
    nodeId: Workflow.Node.Id
    onChange: (value: string) => void
    onCommit: (value: string) => void
    side?: React.ComponentProps<typeof Tooltip.Content>['side']
    className?: string
    placeholder?: string
}

export const ExpressionInput = ({
    value,
    nodeId,
    onChange,
    onCommit,
    side = 'left',
    className,
    placeholder,
}: Props) => {
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <div className='relative flex items-center w-full'>
                    <Input
                        value={value}
                        variant='ghost-no-focus'
                        size='xs'
                        placeholder={placeholder}
                        className={cn(className)}
                        onChange={(e) => onChange(e.currentTarget.value)}
                        onBlur={() => onCommit(value)}
                    />

                </div>
            </Tooltip.Trigger>
            <Tooltip.Content side={side} align='center'>
                <TooltipContent nodeId={nodeId} value={value} />
            </Tooltip.Content>
        </Tooltip.Root>
    )
}

const TooltipContent = ({ nodeId, value }: { nodeId: Workflow.Node.Id, value: string }) => {
    const session = ExecutionSessionSDK.useStore(s => s.session)
    const [result, setResult] = useState<unknown>(undefined)

    const expressionCtx = WorkbenchSDK.useStore(s => 
        WorkbenchSDK.selectors.node.getExpressionContext(s, nodeId, session)
    )

    useEffect(() => {
        try {
            setResult(Expression.evaluate(value, expressionCtx))
        } catch (e) {
            setResult(`Error: ${(e as Error).message}`)
        }
    }, [value, expressionCtx])

    return (
        <div className='flex flex-col gap-1.5'>
            <p className='text-neutral-400 text-[10px]'>Expression result:</p>
            <div>
                <p>Result:</p>
                <JsonView src={result as Record<string, unknown>} className='text-xs' collapsed={3} />
            </div>
        </div>
    )
}
