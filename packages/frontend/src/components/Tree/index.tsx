import { useMemo, useState } from "react"
import { buildTree } from "./builder"
import { DefaultBranchRenderer } from "./BranchRenderer"
import { IndentGuides } from "./IndentGuides"
import type { Tree as TreeD } from "./domain"

interface TreeProps<T_Data = any> {
    root: TreeD.Dummy.Branch<T_Data>
    renderBranch?: TreeD.Branch.Renderer<T_Data>
    className?: string
}

export function Tree<T_Data = any>({ root, renderBranch, className }: TreeProps<T_Data>) {
    const tree = useMemo(() => buildTree(root), [root])

    const initialExpanded = useMemo(() => {
        const set = new Set<string>()
        Object.values(tree).forEach((branch) => {
            if (branch.isExpanded || branch.isExpandedByDefault) {
                set.add(branch.pathString)
            }
        })
        return set
    }, [tree])

    const [expanded, setExpanded] = useState<Set<string>>(initialExpanded)

    const toggle = (path: TreeD.Branch.PathString) => {
        setExpanded((prev) => {
            const next = new Set(prev)
            next.has(path) ? next.delete(path) : next.add(path)
            return next
        })
    }

    const renderer = renderBranch ?? DefaultBranchRenderer

    const renderBranchNode = (branch: TreeD.Branch<T_Data>, level: number) => {
        const isLeaf = !branch.childBranches || Object.keys(branch.childBranches).length === 0
        const isExpanded = expanded.has(branch.pathString)

        return (
            <div key={branch.key}>
                {renderer({
                    branch,
                    level,
                    isExpanded,
                    isLeaf,
                    isLastSibling: branch.isLastSibling,
                    onToggle: () => toggle(branch.pathString),
                })}
                {!isLeaf && (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateRows: isExpanded ? "1fr" : "0fr",
                            transition: "grid-template-rows 200ms ease",
                        }}
                    >
                        <div style={{ overflow: "hidden" }}>
                            {Object.values(branch.childBranches!).map((child) =>
                                renderBranchNode(child as TreeD.Branch<T_Data>, level + 1)
                            )}
                        </div>
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
                .map((branch) => renderBranchNode(branch as TreeD.Branch<T_Data>, 0))}
        </div>
    )
}

Tree.IndentGuides = IndentGuides
