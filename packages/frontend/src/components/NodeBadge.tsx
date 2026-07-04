import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import type { Workflow } from '@pretzel-graph/shared/domain'

interface NodeBadgeProps {
  icon: string
  label: string
  accent?: string
  className?: string
}

export const NodeBadge = ({ icon, label, accent, className = '' }: NodeBadgeProps) => (
  <span
    className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-md ${className}`}
    style={accent ? {
      backgroundColor: `color-mix(in srgb, var(--${accent}) 20%, transparent)`,
      color: `var(--${accent}-foreground)`,
    } : undefined}
  >
    <LazyIcon className='w-3.5 h-3.5 shrink-0' name={icon} />
    {label}
  </span>
)

export const NodeBadgeFromNode = ({ ui, accent = true, className }: { ui: any; accent?: boolean; className?: string }) => (
  <NodeBadge
    icon={ui.icon as string}
    label={ui.displayName}
    accent={accent ? ui.accent : undefined}
    className={className}
  />
)
