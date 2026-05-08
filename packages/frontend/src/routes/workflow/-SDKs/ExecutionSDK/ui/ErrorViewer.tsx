import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import type { Workflow } from '@pretzel-graph/shared/domain'
import { AlertTriangleFill } from '@pretzel-graph/standard-ui/icons/system'
import { Separator } from '@pretzel-graph/standard-ui/foundations/separator'
import { NodeBadgeFromNode } from '@/components/NodeBadge'

const ErrorViewer = () => {
    const execution = ExecutionSDK.useStore(s => s.currentExecution)
    const nodes = WorkbenchSDK.useStore(s => s.data.nodes)

    if (!execution) return null

    const topLevelError = execution.error
    const nodeErrors = Object.entries(execution.session.node_status).filter(
        ([, ns]) => ns.status === 'failed' && ns.error
    ) as [Workflow.Node.Id, { status: string; error: NonNullable<typeof topLevelError> }][]

    return (
        <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2'>
                <AlertTriangleFill size={18} className='text-destructive' />
                <p className='text-sm font-semibold'>Execution failed</p>
            </div>
            <Separator />

            {topLevelError && (
                <div className='flex flex-col gap-1'>
                    <p className='text-xs font-semibold text-foreground'>
                        {topLevelError.message}
                    </p>

                    <p className='text-xs text-muted-foreground'>
                        Code <span className='text-destructive font-medium'>{topLevelError.code}</span>
                    </p>
                </div>
            )}

            {nodeErrors.length > 0 && topLevelError && <Separator />}

            {nodeErrors.map(([nodeId, ns]) => {
                const node = nodes[nodeId]
                const err = ns.error!
                return (
                    <div key={nodeId} className='flex flex-col gap-1'>
                        <div className='flex items-center gap-0.5'>
                            {node
                                ? <NodeBadgeFromNode node={node} accent={false} className='text-xs px-0!' />
                                : <p className='text-xs font-semibold text-foreground'>{nodeId}</p>
                            }
                        </div>
                        <p className='text-xs text-muted-foreground'>{err.message}</p>
                        {err.detail && (
                            <p className='text-xs text-muted-foreground font-mono break-all whitespace-pre-wrap'>
                                {err.detail}
                            </p>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default ErrorViewer
