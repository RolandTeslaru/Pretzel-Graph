import type { Tree } from "./domain"

export function jsonToTree(value: unknown): Tree.Dummy.Branch {
    if (value === null || value === undefined || typeof value !== "object") {
        return { data: value }
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return { containerType: "array" }
        return {
            containerType: "array",
            childBranches: Object.fromEntries(
                value.map((item, i) => [`${i}` as Tree.Branch.Key, jsonToTree(item)])
            ) as Record<Tree.Branch.Key, Tree.Dummy.Branch>,
        }
    }

    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return { containerType: "object" }

    return {
        containerType: "object",
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
            Object.entries(projections).map(([key, outputs]) => {
                const sub = jsonToTree(outputs)
                const meta = branchData?.[key]

                // Without port meta (ProjectionsTree path) the port root keeps the original behavior:
                // `data` is undefined and nested leaves render their raw values straight from jsonToTree.
                //
                // With port meta (PortProjectionsView), `data` carries the meta — so a leaf value would
                // be lost and render as "[object Object]". Stash the raw value on the meta so the renderer
                // can format it: arrays always (a count, even when expandable — "5 items"), and
                // primitives / empty objects when they have no child branches.
                let data = meta
                if (meta !== undefined && (Array.isArray(outputs) || !sub.childBranches))
                    data = { ...(meta as object), isLeafValue: true, leafValue: outputs } as T_Data

                return [
                    key as Tree.Branch.Key,
                    {
                        childBranches: sub.childBranches,
                        containerType: sub.containerType,
                        isExpandedByDefault: true,
                        data,
                    },
                ]
            })
        ) as Record<Tree.Branch.Key, Tree.Dummy.Branch<T_Data>>,
    }
}
