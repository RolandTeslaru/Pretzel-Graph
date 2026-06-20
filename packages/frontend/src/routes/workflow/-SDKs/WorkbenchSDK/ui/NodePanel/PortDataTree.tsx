import { useMemo } from 'react'
import { Tree } from '@/components/Tree/Tree'
import { projectionsToDummyTree } from '@/components/Tree/toTree'
import type { Tree as TreeType } from '@/components/Tree/domain'
import type { Foundations } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

export type PortBranchMeta = {
    displayName?: string
    variant?: Foundations.Port.Variant
    // Set when the port projects to a leaf value (primitive / empty array / empty object), so the
    // root branch can render the value instead of "[object Object]" from the meta itself.
    isLeafValue?: boolean
    leafValue?: unknown
}

// Compact one-line preview for a port-root leaf value. Arrays read as a count ("0 items"),
// empty objects as "{}".
function formatLeafValue(value: unknown): string {
    if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`
    if (value !== null && typeof value === 'object') return Object.keys(value).length === 0 ? '{}' : '{…}'
    return String(value)
}

export function PortBranchRenderer({ branch, level, isExpanded, isLeaf, isLastSibling, onToggle }: TreeType.Branch.RenderProps<PortBranchMeta>) {
    const label = branch.data?.displayName ?? branch.key
    const isPortRoot = level === 0
    const variant = isPortRoot ? branch.data?.variant : undefined

    return (
        <div
            className="flex items-center h-6 pr-1 pl-1 rounded-md cursor-pointer select-none hover:bg-accent/50 text-sm"
            style={variant ? { backgroundColor: `color-mix(in srgb, var(--port-${variant}) 15%, transparent)` } : undefined}
            onClick={onToggle}
        >
            {Array.from({ length: level }).map((_, i) => {
                const isInnermost = i === level - 1

                return (
                    <span key={i} className="shrink-0 w-5 relative self-stretch">
                        {isInnermost ? (
                            isLastSibling ? (
                                <span className="absolute top-0 h-1/2 left-[7px] right-1.5 border-l border-b border-accent-foreground/20 rounded-bl-lg" />
                            ) : (
                                <span className="absolute inset-y-0 left-[7px] border-l border-accent-foreground/20" />
                            )
                        ) : !branch.ancestorIsLast[i + 1] ? (
                            <span className="absolute inset-y-0 left-[7px] border-l border-accent-foreground/20" />
                        ) : null}
                    </span>
                )
            })}
            {!isLeaf ? (
                <SystemIcons.ChevronRight
                    className="shrink-0 h-4 w-4 text-muted-foreground transition-transform duration-150"
                    style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                />
            ) : (
                <></>
            )}
            <span className="whitespace-nowrap text-[11px] font-medium text-foreground">{label}</span>
            {isPortRoot
                // Port root: `data` is the port meta. Show the stashed value summary — arrays render a
                // count even when expandable (e.g. "5 items"), primitives/empty objects their value.
                ? branch.data?.isLeafValue && (
                    <span className="ml-auto whitespace-nowrap text-muted-foreground text-[11px] pl-1">{formatLeafValue(branch.data.leafValue)}</span>
                )
                // Nested value leaf: `data` is the raw JSON value.
                : isLeaf && branch.data !== undefined && (
                    <span className="ml-auto whitespace-nowrap text-muted-foreground text-[11px] pl-1">{String(branch.data)}</span>
                )
            }
        </div>
    )
}

export function PortProjectionsView({
    ports,
    projections,
    emptyMessage,
}: {
    ports: Array<{ id: string; displayName?: string; variant: Foundations.Port.Variant }>
    projections: Record<string, Record<string, unknown>>
    emptyMessage: string
}) {
    const branchData = useMemo(
        () => Object.fromEntries(ports.map(p => [p.id, { displayName: p.displayName, variant: p.variant }])),
        [ports]
    )
    const root = useMemo(() => projectionsToDummyTree(projections, branchData), [projections, branchData])

    if (Object.keys(projections).length === 0)
        return <div className='mt-2 text-xs text-muted-foreground px-1'>{emptyMessage}</div>

    return <Tree root={root} renderBranch={PortBranchRenderer} />
}
