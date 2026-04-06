import type { TreeSDK } from "./sdk"

export const createInternalTree = (src: TreeSDK.Dummy.Tree) => {
    const root: TreeSDK.Internal.Tree = {}
    const branchFlatMap: TreeSDK.Internal.FlatTree = new Map()

    Object.entries(src).forEach(([_dummyBranchKey, _dummyBranch]) => {
        const {newBranch, allBranchesToBeAdded} = createInternalBranch(_dummyBranchKey, _dummyBranch)
        root[_dummyBranchKey] = newBranch

        allBranchesToBeAdded.forEach(branch => {
            branchFlatMap.set(branch.currentPath, branch)
        })
    })

    return { processedTree: root, branchFlatMap };
}

export const createInternalBranch = (
    key:                   string, 
    dummyBranch:           TreeSDK.Dummy.Branch, 
    parentInternalBranch?: TreeSDK.Internal.Branch,
    branchesToBeAdded?:    Set<TreeSDK.Internal.Branch>
) => {
    const childrenLength = Object.values(dummyBranch.children ?? {}).length
    const needsLazyLoading = dummyBranch.children === undefined

    const currentPath = parentInternalBranch ? `${parentInternalBranch.currentPath}.${key}` : key
    const parentPaths = new Set<string>();
    if (parentInternalBranch)
        parentPaths.add(parentInternalBranch.currentPath)

    const newBranch: TreeSDK.Internal.Branch = {
        key,
        currentPath,
        isExpanded: dummyBranch.isExpanded ?? false,
        canBeExpanded: childrenLength > 0 || needsLazyLoading,
        needsLazyLoading,
        parentPaths,
        data: dummyBranch.data,
        overrideRenderBranch: dummyBranch.overrideRenderBranch,
        children: null,
        isLoading: false,
        isMounted: true
    }

    if(!branchesToBeAdded)
        branchesToBeAdded = new Set<TreeSDK.Internal.Branch>()

    branchesToBeAdded.add(newBranch)

    if (!newBranch.needsLazyLoading && childrenLength > 0) {
        newBranch.children = new Map();
        Object.entries(dummyBranch.children).forEach(([_childKey, dummyChildBranch]) => {
            const {
                newBranch: childInternalBranch,
            } = createInternalBranch(
                _childKey, 
                dummyChildBranch, 
                newBranch,
                branchesToBeAdded
            )
            newBranch.children.set(_childKey, childInternalBranch)
        })
    }

    return {
        newBranch,
        allBranchesToBeAdded: branchesToBeAdded
    }
}

