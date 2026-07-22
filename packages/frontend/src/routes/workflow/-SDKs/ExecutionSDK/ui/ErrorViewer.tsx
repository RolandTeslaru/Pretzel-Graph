import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import type { Workflow } from '@pretzel-graph/shared/domain'
import { AlertTriangleFill } from '@pretzel-graph/standard-ui/icons/system'
import { Separator } from '@pretzel-graph/standard-ui/foundations/separator'

const ErrorViewer = () => {
    const execution = ExecutionSDK.useStore(s => s.currentExecution)

    if (!execution) return null

    const topLevelError = execution.error
    const nodeErrors = Object.entries(execution.session.node_status).filter(
        ([, ns]) => ns.status === 'failed' && ns.error
    ) as [Workflow.Node.Id, { status: string; error: NonNullable<typeof topLevelError> }][]

    return (
        <div className='flex flex-col gap-3 w-[300px]'>
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
                const err = ns.error!
                return (
                    <div key={nodeId} className='flex flex-col gap-1'>
                        <div className='flex items-center gap-0.5'>
                            <p className='text-xs font-semibold text-foreground'>{nodeId}</p>
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
