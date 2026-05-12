import { useMemo, useState } from "react"
import { buildTree } from "./builder"
import { DefaultBranchRenderer } from "./BranchRenderer"
import type { Tree as TreeType } from "./domain"

interface TreeProps<T_Data = any> {
    root: TreeType.Dummy.Branch<T_Data>
    renderBranch?: TreeType.BranchRenderer<T_Data>
    className?: string
}

export function Tree<T_Data = any>({ root, renderBranch, className }: TreeProps<T_Data>) {
    const tree = useMemo(() => buildTree(root), [root])

    const initialExpanded = useMemo(() => {
        const set = new Set<string>()
        Object.values(tree).forEach((branch) => {
            if (branch.isExpanded || branch.isExpandedByDefault) {
                set.add(branch.key)
            }
        })
        return set
    }, [tree])

    const [expanded, setExpanded] = useState<Set<string>>(initialExpanded)

    const toggle = (key: string) => {
        setExpanded((prev) => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    }

    const renderer = renderBranch ?? DefaultBranchRenderer

    const renderBranchNode = (branch: TreeType.Branch<T_Data>, level: number) => {
        const isLeaf = !branch.childBranches || Object.keys(branch.childBranches).length === 0
        const isExpanded = expanded.has(branch.key)

        return (
            <div key={branch.key}>
                {renderer({ branch, level, isExpanded, isLeaf, onToggle: () => toggle(branch.key), DefaultRenderer: DefaultBranchRenderer })}
                {!isLeaf && isExpanded && (
                    <div>
                        {Object.values(branch.childBranches!).map((child) =>
                            renderBranchNode(child as TreeType.Branch<T_Data>, level + 1)
                        )}
                    </div>
                )}
            </div>
        )
    }

    if (!root.childBranches || Object.keys(root.childBranches).length === 0) {
        return null
    }

    return (
        <div className={className}>
            {Object.values(tree)
                .filter((branch) => branch.path.length === 2)
                .map((branch) => renderBranchNode(branch as TreeType.Branch<T_Data>, 0))}
        </div>
    )
}
