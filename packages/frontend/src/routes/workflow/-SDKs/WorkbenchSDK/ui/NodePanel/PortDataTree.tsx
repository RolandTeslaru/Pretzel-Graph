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

function PortBranchRenderer({ branch, level, isExpanded, isLeaf, isLastSibling, onToggle, keyNameMap, portVariantMap }: TreeType.Branch.RenderProps & {
    keyNameMap?: Record<string, string | undefined>
    portVariantMap?: Record<string, Foundations.Port.Variant>
}) {
    const label = keyNameMap?.[branch.key] ?? branch.key
    const isPortRoot = level === 0
    const variant = isPortRoot ? portVariantMap?.[branch.key] : undefined

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
                                <span className="absolute top-0 h-1/2 left-[7px] right-1.5 border-l border-b border-primary-foreground/20 rounded-bl-lg" />
                            ) : (
                                <span className="absolute inset-y-0 left-[7px] border-l border-primary-foreground/20" />
                            )
                        ) : !branch.ancestorIsLast[i + 1] ? (
                            <span className="absolute inset-y-0 left-[7px] border-l border-primary-foreground/20" />
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
            <span className="whitespace-nowrap text-[10px] font-medium text-foreground">{label}</span>
            {isLeaf && branch.data !== undefined && (
                <span className="ml-auto whitespace-nowrap text-muted-foreground text-[10px] pl-1">{String(branch.data)}</span>
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
