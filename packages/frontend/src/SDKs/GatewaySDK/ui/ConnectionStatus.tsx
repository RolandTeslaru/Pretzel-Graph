import classNames from 'classnames'
import type { Gateway } from '@pretzel-graph/shared/domain'

const STATUS = {
    inactive: { label: 'Off',        dot: 'bg-muted-foreground/50' },
    pending:  { label: 'Connecting', dot: 'bg-[var(--warning)] animate-pulse' },
    active:   { label: 'Connected',  dot: 'bg-[var(--status-success)]' },
    failed:   { label: 'Failed',     dot: 'bg-destructive' },
} satisfies Record<Gateway.Connection.Status, { label: string; dot: string }>

interface Props {
    status:     Gateway.Connection.Status
    className?: string
}

// Just the coloured dot, for rows too narrow for the word.
export const ConnectionDot = ({ status, className }: Props) => (
    <span className={classNames('size-1.5 shrink-0 rounded-full', STATUS[status].dot, className)} />
)

// A coloured dot and a word for where the connection's socket stands.
export const ConnectionStatus = ({ status, className }: Props) => (
    <span className={classNames('inline-flex items-center gap-1.5 text-muted-foreground', className)}>
        <span className={classNames('size-1.5 shrink-0 rounded-full', STATUS[status].dot)} />
        {STATUS[status].label}
    </span>
)
