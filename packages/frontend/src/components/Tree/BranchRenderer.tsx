import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import type { Tree } from "./domain"

export function DefaultBranchRenderer({ branch, level, isExpanded, isLeaf, onToggle }: Tree.BranchBaseProps) {
    return (
        <div
            className="flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer select-none hover:bg-accent/50 text-sm"
            style={{ paddingLeft: `${level * 12 + 4}px` }}
            onClick={onToggle}
        >
            {!isLeaf ? (
                <SystemIcons.ChevronRight
                    className="shrink-0 h-3.5 w-3.5 text-muted-foreground transition-transform duration-150"
                    style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                />
            ) : (
                <span className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate text-foreground">{branch.key}</span>
        </div>
    )
}
