import classNames from 'classnames'

const sizes = {
    default: {
        indent: 'w-5',
        line: 'left-[7px]',
        radius: 'rounded-bl-lg',
        corner: 'top-[calc(50%-8px)] h-2',
    },
    sm: {
        indent: 'w-4',
        line: 'left-[6px]',
        radius: 'rounded-bl-md',
        corner: 'top-[calc(50%-6px)] h-1.5',
    },
} as const

export type IndentGuidesSize = keyof typeof sizes

interface Props {
    level: number
    ancestorIsLast: boolean[]
    isLastSibling: boolean
    // draws a short elbow into the row even when siblings follow it
    elbow?: boolean
    size?: IndentGuidesSize
}

export function IndentGuides({ level, ancestorIsLast, isLastSibling, elbow = false, size = 'default' }: Props) {
    const styles = sizes[size]

    return (
        <>
            {Array.from({ length: level }).map((_, i) => {
                const isInnermost = i === level - 1

                return (
                    <span key={i} className={classNames('shrink-0 relative self-stretch opacity-20', styles.indent)}>
                        {isInnermost ? (
                            isLastSibling ? (
                                <span className={classNames('absolute top-0 h-1/2 right-0.5 border-l border-b border-accent-foreground', styles.line, styles.radius)} />
                            ) : (
                                <>
                                    <span className={classNames('absolute inset-y-0 border-l border-accent-foreground', styles.line)} />
                                    {elbow && (
                                        <span className={classNames('absolute right-0.5 border-l border-b border-accent-foreground', styles.line, styles.radius, styles.corner)} />
                                    )}
                                </>
                            )
                        ) : !ancestorIsLast[i + 1] ? (
                            <span className={classNames('absolute inset-y-0 border-l border-accent-foreground', styles.line)} />
                        ) : null}
                    </span>
                )
            })}
        </>
    )
}
