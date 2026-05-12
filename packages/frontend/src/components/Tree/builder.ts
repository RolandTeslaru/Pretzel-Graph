import type { Tree } from "./domain";

export const buildTree = (dummyTree: Tree.Dummy.Branch): Tree => {
    const tree: Tree = {} as Tree

    const rootBranch: Tree.Branch = {
        key: "root" as Tree.BranchKey,
        path: ["root" as Tree.BranchKey],
        childBranches: {} as Record<Tree.BranchKey, Tree.Branch>,
    }

    const buildBranch = (
        key: Tree.BranchKey,
        dummyBranch: Tree.Dummy.Branch,
        parentBranch: Tree.Branch,
    ): Tree.Branch => {
        const path = [...parentBranch.path, key]

        const branch: Tree.Branch = {
            key,
            path,
            data: dummyBranch.data,
            isExpandedByDefault: dummyBranch.isExpandedByDefault,
            isExpanded: dummyBranch.isExpanded ?? dummyBranch.isExpandedByDefault ?? false,
        }

        if (dummyBranch.childBranches) {
            const childBranches = {} as Record<Tree.BranchKey, Tree.Branch>
            Object.entries(dummyBranch.childBranches).forEach(([childKey, childDummy]) => {
                childBranches[childKey as Tree.BranchKey] = buildBranch(
                    childKey as Tree.BranchKey,
                    childDummy,
                    branch,
                )
            })
            branch.childBranches = childBranches
        }

        tree[key] = branch
        return branch
    }

    if (dummyTree.childBranches) {
        Object.entries(dummyTree.childBranches).forEach(([branchKey, dummyBranch]) => {
            buildBranch(branchKey as Tree.BranchKey, dummyBranch, rootBranch)
        })
    }

    return tree
}
