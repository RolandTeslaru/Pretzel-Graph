import { Skill } from '@pretzel-graph/shared/domain'
import { IconRenderer } from '@pretzel-graph/standard-ui/icons/IconRenderer'
import classNames from 'classnames'
import { sizeStyles, type ItemSize } from './sizes'

interface SkillCardProps {
    skill: Skill.Meta
    size?: ItemSize
    disabled?: boolean
    onClick?: () => void
}

export function SkillItem({ skill, size = 'default', disabled = false, onClick }: SkillCardProps) {

    const styles = sizeStyles[size]

    return (
        <div
            data-library-item='skill'
            data-library-id={skill.id}
            onClick={disabled ? undefined : onClick}
            className={classNames(
                'group flex gap-1 relative m-auto select-none rounded-md',
                styles.card,
                disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-accent/30',
            )}
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
    )
}
