import type { Tree as TreeDomain } from '@/components/Tree/domain'
import type { FileSystemNodeData } from '../../../actions'

export type FileNode = TreeDomain.Dummy.Branch<FileSystemNodeData>

// Keep a branch if its name matches (with its whole subtree) or any descendant matches
// (as an expanded ancestor). Returns null when nothing in the subtree matches.
function filterBranch(branch: FileNode, query: string): FileNode | null {
    if ((branch.data?.name ?? '').toLowerCase().includes(query)) {
        return { ...branch, isExpandedByDefault: true }
    }
    if (!branch.childBranches) return null

    const kept: Record<string, FileNode> = {}
    for (const [key, child] of Object.entries(branch.childBranches)) {
        const f = filterBranch(child, query)
        if (f) kept[key] = f
    }
    if (Object.keys(kept).length === 0) return null

    return {
        ...branch,
        isExpandedByDefault: true,
        childBranches: kept as FileNode['childBranches'],
    }
}

export function filterTree(root: FileNode, query: string): FileNode {
    if (!root.childBranches) return root
    const kept: Record<string, FileNode> = {}
    for (const [key, child] of Object.entries(root.childBranches)) {
        const f = filterBranch(child, query)
        if (f) kept[key] = f
    }
    return { childBranches: kept as FileNode['childBranches'] }
}
