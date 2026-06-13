import type { Tree } from "./domain";

export const buildTree = (dummyTree: Tree.Dummy.Branch): Tree => {
    const tree: Tree = {} as Tree

    const rootBranch: Tree.Branch = {
        key: "root" as Tree.Branch.Key,
        path: ["root" as Tree.Branch.Key],
        pathString: "root" as Tree.Branch.PathString,
        childBranches: {} as Record<Tree.Branch.Key, Tree.Branch>,
    }

    const buildBranch = (
        key: Tree.Branch.Key,
        dummyBranch: Tree.Dummy.Branch,
        parentBranch: Tree.Branch,
    ): Tree.Branch => {
        const path = [...parentBranch.path, key]
        const pathString = path.join(".") as Tree.Branch.PathString

        const branch: Tree.Branch = {
            key,
            path,
            pathString,
            data: dummyBranch.data,
            isExpandedByDefault: dummyBranch.isExpandedByDefault,
            isExpanded: dummyBranch.isExpanded ?? dummyBranch.isExpandedByDefault ?? false,
        }

        if (dummyBranch.childBranches) {
            const childBranches = {} as Record<Tree.Branch.Key, Tree.Branch>


            // Recursively build child branches
            Object.entries(dummyBranch.childBranches).forEach(([childKey, childDummy]) => {
                childBranches[childKey as Tree.Branch.Key] = buildBranch(
                    childKey as Tree.Branch.Key,
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
            buildBranch(branchKey as Tree.Branch.Key, dummyBranch, rootBranch)
        })
    }

    return tree
}
