import { Skill } from '@pretzel-graph/shared/domain'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import classNames from 'classnames'
import { sizeStyles, type ItemSize } from './sizes'
import { SkillContextMenu } from '../../context-menus/skill'

interface SkillCardProps {
    skill: Skill.Meta
    size?: ItemSize
    onClick?: () => void
}

export function SkillItem({ skill, size = 'default', onClick }: SkillCardProps) {

    const styles = sizeStyles[size]

    return (
        <SkillContextMenu skill={skill}>
            <div
                onClick={onClick}
                className={classNames('group flex gap-1 relative m-auto cursor-pointer select-none rounded-md hover:bg-accent/30', styles.card)}
            >
                <div className='rounded-md p-1 flex flex-col gap-1 m-auto w-auto h-auto '>
                    <IconRenderer
                        name={skill.icon ?? Skill.DEFAULT_ICON}
                        className={classNames('shrink-0 m-auto', styles.workflowIcon)}
                        style={{ color: `var(--${skill.accent ?? Skill.DEFAULT_ACCENT})` }}
                    />
                    <div className="min-w-0 flex flex-col gap-1">
                        <p className={classNames('font-medium text-center truncate', styles.name)}>{skill.name}</p>
                    </div>
                </div>
            </div>
        </SkillContextMenu>
    )
}
