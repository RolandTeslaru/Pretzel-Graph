import type { Tree } from "./domain";

export const buildTree = (dummyTree: Tree.Dummy.Branch): Tree => {
    const tree: Tree = {} as Tree

    const rootBranch: Tree.Branch = {
        key: "root" as Tree.Branch.Key,
        path: ["root" as Tree.Branch.Key],
        pathString: "root" as Tree.Branch.PathString,
        childBranches: {} as Record<Tree.Branch.Key, Tree.Branch>,
        isLastSibling: true,
        ancestorIsLast: [],
    }

    const buildBranch = (
        key: Tree.Branch.Key,
        dummyBranch: Tree.Dummy.Branch,
        parentBranch: Tree.Branch,
        isLastSibling: boolean,
        ancestorIsLast: boolean[],
    ): Tree.Branch => {
        const path = [...parentBranch.path, key]
        const pathString = path.join(".") as Tree.Branch.PathString

        const branch: Tree.Branch = {
            key,
            path,
            pathString,
            data: dummyBranch.data,
            containerType: dummyBranch.containerType,
            isExpandedByDefault: dummyBranch.isExpandedByDefault,
            isExpanded: dummyBranch.isExpanded ?? dummyBranch.isExpandedByDefault ?? false,
            isLastSibling,
            ancestorIsLast,
        }

        if (dummyBranch.childBranches) {
            const childBranches = {} as Record<Tree.Branch.Key, Tree.Branch>
            const childKeys = Object.keys(dummyBranch.childBranches)
            const childAncestorIsLast = [...ancestorIsLast, isLastSibling]
            childKeys.forEach((childKey, i) => {
                childBranches[childKey as Tree.Branch.Key] = buildBranch(
                    childKey as Tree.Branch.Key,
                    dummyBranch.childBranches![childKey as Tree.Branch.Key],
                    branch,
                    i === childKeys.length - 1,
                    childAncestorIsLast,
                )
            })
            branch.childBranches = childBranches
        }

        tree[key] = branch
        return branch
    }

    if (dummyTree.childBranches) {
        const rootKeys = Object.keys(dummyTree.childBranches)
        rootKeys.forEach((branchKey, i) => {
            buildBranch(
                branchKey as Tree.Branch.Key,
                dummyTree.childBranches![branchKey as Tree.Branch.Key],
                rootBranch,
                i === rootKeys.length - 1,
                [],
            )
        })
    }

    return tree
}
