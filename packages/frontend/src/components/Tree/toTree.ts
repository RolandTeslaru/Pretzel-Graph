import type { Tree } from "./domain"

export function jsonToTree(value: unknown): Tree.Dummy.Branch {
    if (value === null || value === undefined || typeof value !== "object") {
        return { data: value }
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return { data: value }
        return {
            childBranches: Object.fromEntries(
                value.map((item, i) => [`${i}` as Tree.BranchKey, jsonToTree(item)])
            ) as Record<Tree.BranchKey, Tree.Dummy.Branch>,
        }
    }

    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return {}

    return {
        childBranches: Object.fromEntries(
            entries.map(([k, v]) => [k as Tree.BranchKey, jsonToTree(v)])
        ) as Record<Tree.BranchKey, Tree.Dummy.Branch>,
    }
}

export function projectionsToTree(
    projections: Record<string, Record<string, unknown>>
): Tree.Dummy.Branch {
    return {
        childBranches: Object.fromEntries(
            Object.entries(projections).map(([nodeId, outputs]) => [
                nodeId as Tree.BranchKey,
                { ...jsonToTree(outputs), isExpandedByDefault: true },
            ])
        ) as Record<Tree.BranchKey, Tree.Dummy.Branch>,
    }
}
