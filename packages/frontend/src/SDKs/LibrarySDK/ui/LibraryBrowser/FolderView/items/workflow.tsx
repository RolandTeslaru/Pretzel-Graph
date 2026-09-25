import { Badge } from '@pretzel-graph/standard-ui/foundations'
import type { Library } from '@pretzel-graph/shared/domain'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import { WorkflowIllustration } from '@pretzel-graph/standard-ui/icons/illustrations'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import classNames from 'classnames'
import { sizeStyles, type ItemSize } from './sizes'

interface WorkflowCardProps {
    workflow: Library.WorkflowMeta
    size?: ItemSize
    disabled?: boolean
    onClick?: () => void
}

function iconColor(workflow: Library.WorkflowMeta) {
    const token = workflow.icon_color ?? workflow.accent

    return token ? `var(--${token})` : "var(--primary)"
}

export function WorkflowItem({ workflow, size = 'default', disabled = false, onClick }: WorkflowCardProps) {

    const isDeployed = VersionControlSDK.useStore((s) => Boolean(s.deployments[workflow.id]))

    const styles = sizeStyles[size]

    const handleClick = disabled ? undefined : onClick

    return (
        <div
            data-library-item='workflow'
            data-library-id={workflow.id}
            onClick={handleClick}
            className={classNames(
                'group flex gap-1 relative m-auto select-none rounded-md',
                styles.card,
                workflow.hidden && 'opacity-50',
                disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-accent/30',
            )}
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
                    {isDeployed ? (
                        <Badge variant="success" className='mx-auto' size={styles.badge}>
                            Deployed
                        </Badge>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
