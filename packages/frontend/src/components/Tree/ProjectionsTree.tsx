import { useMemo } from "react"
import { Tree } from "./Tree"
import { projectionsToTree } from "./toTree"
import type { Tree as TreeType } from "./domain"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"

interface Props {
    projections: Record<string, Record<string, unknown>>
    className?: string
}

function renderValue(value: unknown): string {
    if (value === null) return "null"
    if (value === undefined) return "—"
    if (Array.isArray(value)) return `[${value.length}]`
    return String(value)
}

function ProjectionBranchRenderer({ branch, level, isExpanded, isLeaf, onToggle }: TreeType.BranchRendererProps) {
    // Shorten node IDs at the top level: "Integrations.Google.GenerativeAI-7qtrc" → "GenerativeAI-7qtrc"
    const label = level === 0
        ? branch.key.split(".").at(-1) ?? branch.key
        : branch.key

    return (
        <div
            className="flex items-center gap-1.5 py-0.5 px-1 rounded cursor-pointer select-none hover:bg-accent/50 text-xs group"
            style={{ paddingLeft: `${level * 14 + 4}px` }}
            onClick={onToggle}
        >
            {!isLeaf ? (
                <SystemIcons.ChevronRight
                    className="shrink-0 h-3 w-3 text-muted-foreground transition-transform duration-150"
                    style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                />
            ) : (
                <span className="h-3 w-3 shrink-0" />
            )}

            <span className="text-foreground/80 font-medium truncate">{label}</span>

            {isLeaf && branch.data !== undefined && (
                <>
                    <span className="text-muted-foreground/50 shrink-0">:</span>
                    <span className="text-muted-foreground truncate">{renderValue(branch.data)}</span>
                </>
            )}
        </div>
    )
}

export function ProjectionsTree({ projections, className }: Props) {
    const root = useMemo(() => projectionsToTree(projections), [projections])

    return (
        <Tree
            root={root}
            renderBranch={ProjectionBranchRenderer}
            className={className}
        />
    )
}
