import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { Expression, Workflow } from '@pretzel-graph/shared/domain'
import { useState, useEffect } from 'react'
import JsonView from 'react18-json-view'

interface Props { 
    nodeId: Workflow.Node.Id,
    value: string 
}

export const TooltipContent: React.FC<Props> = ({ nodeId, value }) => {
    const session = ExecutionSDK.useStore(s => s.currentExecution?.session);
    const [result, setResult] = useState<unknown>(undefined)

    const expressionCtx = WorkbenchSDK.useStore(s =>
        s.selectors.node.getExpressionContext(s, nodeId, session)
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
