import type { Tree } from "./domain"

export function jsonToTree(value: unknown): Tree.Dummy.Branch {
    if (value === null || value === undefined || typeof value !== "object") {
        return { data: value }
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return { data: value }
        return {
            childBranches: Object.fromEntries(
                value.map((item, i) => [`${i}` as Tree.Branch.Key, jsonToTree(item)])
            ) as Record<Tree.Branch.Key, Tree.Dummy.Branch>,
        }
    }

    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return {}

    return {
        childBranches: Object.fromEntries(
            entries.map(([k, v]) => [k as Tree.Branch.Key, jsonToTree(v)])
        ) as Record<Tree.Branch.Key, Tree.Dummy.Branch>,
    }
}

export function projectionsToDummyTree<T_Data = undefined>(
    projections: Record<string, Record<string, unknown>>,
    branchData?: Record<string, T_Data>
): Tree.Dummy.Branch<T_Data> {
    return {
        childBranches: Object.fromEntries(
            Object.entries(projections).map(([key, outputs]) => [
                key as Tree.Branch.Key,
                { ...jsonToTree(outputs), isExpandedByDefault: true, data: branchData?.[key] },
            ])
        ) as Record<Tree.Branch.Key, Tree.Dummy.Branch<T_Data>>,
    }
}
