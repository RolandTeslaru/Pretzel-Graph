import { useMemo } from 'react'
import { Tree } from '@/components/Tree'
import { projectionsToDummyTree } from '@/components/Tree/toTree'
import type { Tree as TreeType } from '@/components/Tree/domain'
import type { Execution, Foundations } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { toast } from 'sonner'

export type PortBranchMeta = {
    displayName?: string
    variant?: Foundations.Port.Variant
    // Set when the port projects to a leaf value (primitive / empty array / empty object), so the
    // root branch can render the value instead of "[object Object]" from the meta itself.
    isLeafValue?: boolean
    leafValue?: unknown
    hasData?: boolean
    onRemove?: () => void
    onEdit?: () => void
}

// Compact one-line preview for a port-root leaf value. Arrays read as a count ("0 items"),
// empty objects as "{}".
function formatLeafValue(value: unknown): string {
    if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`
    if (value !== null && typeof value === 'object') return Object.keys(value).length === 0 ? '{}' : '{…}'
    return String(value)
}

function branchToJsonValue(branch: TreeType.Branch): unknown {
    const children = Object.entries(branch.childBranches ?? {})

    if (children.length === 0) {
        if (branch.containerType === 'array') return []
        if (branch.containerType === 'object') return {}
        return branch.data
    }

    const entries = children.map(([key, child]) => [key, branchToJsonValue(child)] as const)

    if (branch.containerType === 'array')
        return entries.map(([, value]) => value)

    return Object.fromEntries(entries)
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
    const isEmptyPort = isPortRoot && branch.data?.hasData === false

    let value: string | null = null
    if (isPortRoot && !isEmptyPort && branch.data?.isLeafValue)
        value = formatLeafValue(branch.data.leafValue)
    else if (!isPortRoot && isLeaf && branch.data !== undefined)
        value = String(branch.data)

    return (
        <div
            className="group flex items-center h-6 px-1 rounded-md cursor-pointer select-none hover:bg-accent/50 text-sm"
            style={variant ? { backgroundColor: `color-mix(in srgb, var(--port-${variant}) 15%, transparent)` } : undefined}
            onClick={onToggle}
        >
            <Tree.IndentGuides level={level} ancestorIsLast={branch.ancestorIsLast} isLastSibling={isLastSibling} elbow={!isLeaf} size="sm" />

            {!isLeaf && (
                <>
                    <SystemIcons.ChevronRight
                        className="shrink-0 h-4 w-4 text-muted-foreground transition-transform duration-150"
                        style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                    />
                </>
            )}

            <span className="whitespace-nowrap text-[11px] font-medium text-foreground">{label}</span>

            {isEmptyPort && <span className="ml-auto pl-1 italic text-muted-foreground/60 text-[11px]">no data</span>}

            {value !== null && <ValuePreview label={label} value={value} breadcrumbs={[label]} />}

            {!isLeaf &&
                <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className={value !== null ? "ml-1" : "ml-auto"}
                    aria-label={`Copy ${label} as JSON`}
                    title="Copy as JSON"
                    onClick={async (e) => {
                        e.stopPropagation()
                        const json = JSON.stringify(branchToJsonValue(branch), null, 2)

                        try {
                            await navigator.clipboard.writeText(json)
                            toast.success(`Copied branch "${label}" to clipboard`)
                        } catch {
                            toast.error('Failed to copy JSON')
                        }
                    }}
                >
                    <SystemIcons.Copy className="size-3 hidden group-hover:flex" />
                </Button>
            }

            {isPortRoot && branch.data?.onEdit &&
                <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="ml-1"
                    aria-label={`Edit ${label}`}
                    title="Edit port"
                    onClick={(e) => {
                        e.stopPropagation()
                        branch.data?.onEdit?.()
                    }}
                >
                    <SystemIcons.SquarePen className="size-3 hidden group-hover:flex" />
                </Button>
            }

            {isPortRoot && branch.data?.onRemove &&
                <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="ml-1"
                    aria-label={`Remove ${label}`}
                    title="Remove port"
                    onClick={(e) => {
                        e.stopPropagation()
                        branch.data?.onRemove?.()
                    }}
                >
                    <SystemIcons.X className="size-3 hidden group-hover:flex" />
                </Button>
            }
        </div>
    )
}



interface Props {
    ports: Array<{ id: string; displayName?: string; variant: Foundations.Port.Variant; isAddedByUser?: boolean }>
    projections: Execution.Session["node_output_projections"]
    emptyMessage: string
    onRemovePort?: (portId: string) => void
    onEditPort?: (portId: string) => void
}


export function PortProjectionsView({
    ports,
    projections,
    emptyMessage,
    onRemovePort,
    onEditPort,
}: Props) {
    const root = useMemo(() => {
        const ordered: Record<string, unknown> = {}
        const branchData: Record<string, PortBranchMeta> = {}

        for (const port of ports) {
            const hasData = port.id in projections
            ordered[port.id] = hasData ? projections[port.id as keyof typeof projections] : undefined
            const onRemove = onRemovePort && port.isAddedByUser ? () => onRemovePort(port.id) : undefined
            const onEdit = onEditPort && port.isAddedByUser ? () => onEditPort(port.id) : undefined
            branchData[port.id] = { displayName: port.displayName, variant: port.variant, hasData, onRemove, onEdit }
        }

        for (const [key, value] of Object.entries(projections)) {
            if (key in ordered)
                continue
            ordered[key] = value
            branchData[key] = { hasData: true }
        }

        return projectionsToDummyTree(ordered as Record<string, Record<string, unknown>>, branchData)
    }, [ports, projections, onRemovePort, onEditPort])

    if (ports.length === 0 && Object.keys(projections).length === 0)
        return <div className='mt-2 text-xs text-muted-foreground px-1'>{emptyMessage}</div>

    return <Tree root={root} renderBranch={PortBranchRenderer} />
}
