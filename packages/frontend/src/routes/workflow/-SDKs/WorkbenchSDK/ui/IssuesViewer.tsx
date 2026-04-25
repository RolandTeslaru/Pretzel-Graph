import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import type { Validation, Workflow } from '@pretzel-graph/shared/domain'
import { AlertTriangleFill } from '@pretzel-graph/standard-ui/icons/system'
import { Separator } from '@pretzel-graph/standard-ui/foundations/separator'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'

const IssuesViewer = () => {
    const issues = WorkbenchSDK.useStore(s => s.issues)
    const nodes = WorkbenchSDK.useStore(s => s.workflow.data.nodes)

    const nodeIssueEntries = Object.entries(issues.nodes) as [Workflow.Node.Id, Validation.Issue.Node][]

    return (
        <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2'>
                <AlertTriangleFill size={18} />
                <p className='text-sm font-semibold'>Workflow has issues</p>
            </div>
            <Separator />
            {nodeIssueEntries.map(([nodeId, nodeIssue]) => {
                const node = nodes[nodeId]
                const fieldIssues = Object.values(nodeIssue.fields)
                const inputIssues = Object.values(nodeIssue.inputs)
                return (
                    <div key={nodeId} className='flex flex-col gap-1'>
                        <div className='flex items-center gap-0.5'>
                            {node?.icon && (
                                <LazyIcon name={node.icon} className='w-3 h-3 shrink-0' />
                            )}
                            <p className='text-xs font-semibold text-foreground'>{node?.displayName ?? nodeId}</p>
                        </div>
                        {inputIssues.map((issue, i) => (
                            <p key={i} className='text-xs text-muted-foreground'>
                                Input{' '}
                                <span className='text-destructive font-medium'>{issue.input.id}</span>
                                {issue.type === 'missing_connection'
                                    ? ' requires a connection'
                                    : ' requires a value or connection'}
                            </p>
                        ))}
                        {fieldIssues.map((issue, i) => (
                            <p key={i} className='text-xs text-muted-foreground'>
                                Field{' '}
                                <span className='text-destructive font-medium'>{issue.field.id}</span>
                                {' '}is required
                            </p>
                        ))}
                    </div>
                )
            })}
            {issues.cycles.map((cycle, i) => (
                <div key={i} className='flex flex-col gap-1'>
                    <p className='text-xs font-semibold text-foreground'>Cycle detected</p>
                    <div className='flex flex-wrap items-center gap-1 text-xs text-muted-foreground'>
                        {cycle.nodes.map((id, i) => {
                            const n = nodes[id]
                            return (
                                <span key={id} className='flex items-center gap-0.5'>
                                    {i > 0 && <span>→</span>}
                                    {n?.icon && <LazyIcon name={n.icon} className='w-3 h-3 shrink-0' />}
                                    <span>{n?.displayName ?? id}</span>
                                </span>
                            )
                        })}
                        <span>must include a routing node</span>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default IssuesViewer
