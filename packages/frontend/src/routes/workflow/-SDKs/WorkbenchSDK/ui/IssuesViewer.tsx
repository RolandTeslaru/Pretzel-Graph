import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import type { Validation, Workflow } from '@pretzel-graph/shared/domain'
import { AlertTriangleFill } from '@pretzel-graph/standard-ui/icons/system'
import { Separator } from '@pretzel-graph/standard-ui/foundations/separator'
import { NodeBadgeFromNode } from '@/components/NodeBadge'

const IssuesViewer = () => {
    const issues = WorkbenchSDK.useDocument(d => d.issues)
    const nodes = WorkbenchSDK.useDocument(d => d.data.nodes)

    const nodeIssueEntries = Object.entries(issues.nodes) as [Workflow.Node.Id, Validation.Issue.Node][]

    const totalIssues = nodeIssueEntries.reduce((sum, [, nodeIssue]) =>
        sum
        + Object.keys(nodeIssue.inputs).length
        + Object.keys(nodeIssue.fields).length
        + Object.keys(nodeIssue.credentials).length,
        issues.cycles.length,
    )

    return (
        <div className='flex flex-col gap-3 w-[300px]'>
            <div className='flex items-center gap-2'>
                <AlertTriangleFill size={18} />
                <p className='text-sm font-semibold'>Workflow has {totalIssues === 1 ? 'an issue' : 'multiple issues'}</p>
            </div>
            <Separator />
            {nodeIssueEntries.map(([nodeId, nodeIssue]) => {
                const node = nodes[nodeId]

                const state = WorkbenchSDK.document;
                const ui = state.selectors.node.getUI(state, nodeId);

                const messages = [
                    ...Object.values(nodeIssue.inputs).map(issue => (
                        <>
                            Input{' '}
                            <span className='text-destructive font-medium'>{issue.input.id}</span>
                            {issue.type === 'missing_connection'
                                ? ' requires a connection'
                                : ' requires a value or connection'}
                        </>
                    )),
                    ...Object.values(nodeIssue.fields).map(issue => (
                        <>
                            Field{' '}
                            <span className='text-destructive font-medium'>{issue.field.id}</span>
                            {' '}is required
                        </>
                    )),
                    ...Object.values(nodeIssue.credentials).map(issue => (
                        <>
                            Credential{' '}
                            <span className='text-destructive font-medium'>{issue.templateId}</span>
                            {' '}is required
                        </>
                    )),
                ]

                return (
                    <div key={nodeId} className='flex flex-col gap-1'>
                        <div className='flex items-center gap-0.5'>
                            {node
                                ? <NodeBadgeFromNode ui={ui} accent={false} className='text-xs px-0!' />
                                : <p className='text-xs font-semibold text-foreground'>{nodeId}</p>
                            }
                        </div>
                        {messages.map((message, i) => (
                            <p key={i} className='text-xs text-muted-foreground'>{message}</p>
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
                            const state = WorkbenchSDK.document;
                            const ui = state.selectors.node.getUI(state, id);
                            return (
                                <span key={id} className='flex items-center gap-1'>
                                    {i > 0 && <span>→</span>}
                                    {n
                                        ? <NodeBadgeFromNode ui={ui} className='text-xs' />
                                        : <span>{id}</span>
                                    }
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
