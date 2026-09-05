import { Badge } from '@pretzel-graph/standard-ui/foundations'
import type { Library } from '@pretzel-graph/shared/domain'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { WorkflowIllustration } from '@pretzel-graph/standard-ui/icons/illustrations'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import classNames from 'classnames'
import { sizeStyles, type ItemSize } from './sizes'
import { WorkflowContextMenu } from '../../context-menus/workflow'

interface WorkflowCardProps {
    workflow: Library.WorkflowMeta
    size?: ItemSize
    onClick?: () => void
}

function iconColor(workflow: Library.WorkflowMeta) {
    const token = workflow.icon_color ?? workflow.accent

    return token ? `var(--${token})` : "var(--primary)"
}

export function WorkflowItem({ workflow, size = 'default', onClick }: WorkflowCardProps) {

    const hasActiveWorkflow = VersionControlSDK.useStore((s) => Boolean(s.activeWorkflows[workflow.id]))

    const styles = sizeStyles[size]

    return (
        <WorkflowContextMenu workflow={workflow} onOpen={onClick}>
            <div
                onClick={onClick}
                className={classNames('group flex gap-1 relative m-auto cursor-pointer select-none rounded-md hover:bg-accent/30', styles.card, workflow.hidden && 'opacity-50')}
            >
                <div className='rounded-md p-1 flex flex-col gap-1 m-auto w-auto h-auto '>
                    {workflow.icon ? (
                        <IconRenderer
                            name={workflow.icon}
                            className={classNames('shrink-0 m-auto', styles.workflowIcon)}
                            style={{ color: iconColor(workflow) }}
                        />
                    ) : (
                        <WorkflowIllustration
                            className={classNames('shrink-0 m-auto', styles.workflowIcon)}
                            style={{ color: "var(--primary)" }}
                        />
                    )}
                    <div className="min-w-0 flex flex-col gap-1">

                        <p className={classNames('font-medium text-center truncate', styles.name)}>{workflow.display_name || 'Untitled'}</p>
                        {hasActiveWorkflow ? (
                            <Badge variant="success" className='mx-auto' size={styles.badge}>
                                Active
                            </Badge>
                        ) : null}
                    </div>
                </div>
            </div>
        </WorkflowContextMenu>
    )
}
