import { ExecutionSessionSDK } from '@/routes/workflow/-SDKs/ExecutionSessionSDK/sdk'
import { SandboxSDK } from '@/SDKs/SandboxSDK'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { Expression, Workflow } from '@vx-agent-editor/shared/domain'
import { Input, Spinner, Tooltip } from '@vx-agent-editor/vx-ui/foundations'
import { cn } from '@vx-agent-editor/vx-ui/utils/cn'
import { useEffect, useMemo, useState } from 'react'
import JsonView from 'react18-json-view'

const PORT_REF_PATTERN = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g

interface ExpressionInputProps {
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
}: ExpressionInputProps) => {
    const uniquePortNames = [...new Set([...value.matchAll(PORT_REF_PATTERN)].map(m => m[1]))]

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
                <TooltipContent nodeId={nodeId} uniquePortNames={uniquePortNames} value={value} />
            </Tooltip.Content>
        </Tooltip.Root>
    )
}

const TooltipContent = ({ nodeId, uniquePortNames, value }: { nodeId: Workflow.Node.Id, uniquePortNames: string[], value: string }) => {
    const session = ExecutionSessionSDK.useStore(s => s.session)
    const [result, setResult] = useState<unknown>(undefined)
    const [loading, setLoading] = useState(false)

    const hasSessionData = Object.keys(session.node_output_projections).length > 0
    const incomingData = useMemo(
        () => WorkbenchSDK.selectors.execution.getNodeIncomingData(WorkbenchSDK.state, nodeId, session),
        [nodeId, session]
    )

    useEffect(() => {
        if (!incomingData) return
        let cancelled = false
        try {
            const processedExpression = Expression.preprocess(value, incomingData)
            setLoading(true)
            SandboxSDK.run(`return ${processedExpression}`)
                .then(r => { if (!cancelled) { setResult(r); setLoading(false) } })
                .catch(e => { if (!cancelled) {
                    setResult(`Error: ${(e as Error).message}`)    
                    setLoading(false) 
                } })
        } catch (e) {
            if (!cancelled) { 
                setResult(`Error: ${(e as Error).message}`)
                setLoading(false) 
            }
        }
        return () => { cancelled = true }
    }, [value, incomingData])

    if (uniquePortNames.length === 0)
        return <p className='text-neutral-400 text-[10px]'>Plain value</p>

    if (!hasSessionData)
        return <p className='text-neutral-400 text-[10px]'>Run the workflow to preview</p>

    if (!incomingData)
        return <p className='text-neutral-400 text-[10px]'>No incoming data</p>

    return (
        <div className='flex flex-col gap-1.5'>
            <p className='text-neutral-400 text-[10px]'>Expression result:</p>
            {loading
                ? <Spinner />
                :
                <div>
                    <p>Result:</p>
                    <JsonView src={result as Record<string, unknown>} className='text-xs' collapsed={3} />
                </div>
            }
        </div>
    )
}
