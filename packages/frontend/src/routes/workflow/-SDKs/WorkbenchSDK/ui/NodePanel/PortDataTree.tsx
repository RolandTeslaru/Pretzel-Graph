import { Tree } from '@/components/Tree/Tree'
import type { Tree as TreeType } from '@/components/Tree/domain'
import type { Foundations } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'

interface Props {
    root: TreeType.Dummy.Branch
    keyNameMap?: Record<string, string | undefined>
    portVariantMap?: Record<string, Foundations.Port.Variant>
    className?: string
}

function PortBranchRenderer({ branch, level, isExpanded, isLeaf, onToggle, keyNameMap, portVariantMap }: TreeType.BranchBaseProps & {
    keyNameMap?: Record<string, string | undefined>
    portVariantMap?: Record<string, Foundations.Port.Variant>
}) {
    const label = keyNameMap?.[branch.key] ?? branch.key
    const isPortRoot = level === 0
    const variant = isPortRoot ? portVariantMap?.[branch.key] : undefined

    return (
        <div
            className="flex items-center gap-1 py-0.5 px-1 rounded-md cursor-pointer select-none hover:bg-accent/50 text-sm"
            style={{
                paddingLeft: `${level * 12 + 4}px`,
                ...(variant && {
                    backgroundColor: `color-mix(in srgb, var(--port-${variant}) 15%, transparent)`,
                })
            }}
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
            <span className="truncate text-foreground">{label}</span>
            {isLeaf && branch.data !== undefined && (
                <span className="ml-auto truncate text-muted-foreground text-xs pl-2">{String(branch.data)}</span>
            )}
        </div>
    )
}

export function PortDataTree({ root, keyNameMap, portVariantMap, className }: Props) {
    return (
        <Tree
            root={root}
            className={className}
            renderBranch={(props) => (
                <PortBranchRenderer {...props} keyNameMap={keyNameMap} portVariantMap={portVariantMap} />
            )}
        />
    )
}
