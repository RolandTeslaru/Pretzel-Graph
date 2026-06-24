import { useMemo } from 'react'
import { Tree } from '@/components/Tree/Tree'
import { projectionsToDummyTree } from '@/components/Tree/toTree'
import type { Tree as TreeType } from '@/components/Tree/domain'
import type { Foundations } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@/SDKs/DialogSDK'

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

// One column of vertical tree lines per ancestor level. The innermost column draws the
// corner/elbow into this row; outer columns draw a pass-through line only when the ancestor
// at that depth still has siblings below it.
function IndentGuides({ level, ancestorIsLast, isLastSibling }: { level: number; ancestorIsLast: boolean[]; isLastSibling: boolean }) {
    const line = "absolute inset-y-0 left-[7px] border-l border-accent-foreground/20"

    return Array.from({ length: level }).map((_, i) => {
        const isInnermost = i === level - 1

        let guide = null
        if (isInnermost) {
            guide = isLastSibling
                ? <span className="absolute top-0 h-1/2 left-[7px] right-1.5 border-l border-b border-accent-foreground/20 rounded-bl-lg" />
                : <span className={line} />
        } else if (!ancestorIsLast[i + 1]) {
            guide = <span className={line} />
        }

        return <span key={i} className="shrink-0 w-5 relative self-stretch">{guide}</span>
    })
}

function openValueDialog(label: string, value: string, breadcrumbs: string[]) {
    const id = `port-value-${breadcrumbs.join('.')}`
    DialogSDK.actions.push(id, (props) => (
        <DialogSDK.Template {...props} className="w-[640px] max-w-[90vw] overflow-hidden">
            <div className="flex flex-col p-4 h-full gap-2 overflow-auto max-h-[60vh] ">
                <div className="flex items-center flex-wrap gap-0.5 text-[11px] text-muted-foreground">
                    {breadcrumbs.map((crumb, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                            {i > 0 && <SystemIcons.ChevronRight className="h-3 w-3 opacity-50" />}
                            <span className={i === breadcrumbs.length - 1 ? 'font-semibold text-foreground' : ''}>{crumb}</span>
                        </span>
                    ))}
                </div>
                <pre className="p-1 rounded-md bg-input/60 whitespace-pre-wrap break-words text-xs">{value}</pre>
            </div>
        </DialogSDK.Template>
    ))
}

// Right-aligned value cell. The text truncates; an expand button appears on row hover
// (CSS-only via the parent's `group`) to open the full value in a dialog.
function ValuePreview({ label, value, breadcrumbs }: { label: string; value: string; breadcrumbs: string[] }) {
    return (
        <>
            <span className="ml-auto truncate text-muted-foreground text-[11px] pl-1">{value}</span>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openValueDialog(label, value, breadcrumbs) }}
                className="shrink-0 hidden group-hover:flex items-center ml-1 text-muted-foreground hover:text-foreground"
            >
                <SystemIcons.Maximize2 className="h-3 w-3" />
            </button>
        </>
    )
}

export function PortBranchRenderer({ branch, level, isExpanded, isLeaf, isLastSibling, onToggle }: TreeType.Branch.RenderProps<PortBranchMeta>) {
    const label = branch.data?.displayName ?? branch.key
    const isPortRoot = level === 0
    const variant = isPortRoot ? branch.data?.variant : undefined

    // Port roots show a one-line summary of their stashed value; nested leaves show the raw value.
    let value: string | null = null
    if (isPortRoot && branch.data?.isLeafValue) value = formatLeafValue(branch.data.leafValue)
    else if (!isPortRoot && isLeaf && branch.data !== undefined) value = String(branch.data)

    return (
        <div
            className="group flex items-center h-6 px-1 rounded-md cursor-pointer select-none hover:bg-accent/50 text-sm"
            style={variant ? { backgroundColor: `color-mix(in srgb, var(--port-${variant}) 15%, transparent)` } : undefined}
            onClick={onToggle}
        >
            <IndentGuides level={level} ancestorIsLast={branch.ancestorIsLast} isLastSibling={isLastSibling} />

            {!isLeaf && (
                <SystemIcons.ChevronRight
                    className="shrink-0 h-4 w-4 text-muted-foreground transition-transform duration-150"
                    style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                />
            )}

            <span className="whitespace-nowrap text-[11px] font-medium text-foreground">{label}</span>

            {value !== null && <ValuePreview label={label} value={value} breadcrumbs={[label]} />}
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
