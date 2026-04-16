import type { TreeSDK } from "./sdk";

export function _createTreeReducers_() {
    const reducers: TreeSDKReducers = Object.freeze({
        addInternalBranch: (s, treeKey, flatMap, { branch }) => {
            // Check for queued branches
            reducers.checkAndMergePendingChildren(s, treeKey, flatMap, { branch });

            flatMap.set(branch.currentPath, branch)

            // Iteratively add all children of the branch to the flat map
            // Recursively add all children of this branch
            branch.children?.forEach(_child => {
                if (!flatMap.has(_child.currentPath)) {
                    // Ensure child's parentPaths contains current branch
                    _child.parentPaths.add(branch.currentPath)

                    reducers.addInternalBranch(s, treeKey, flatMap, { branch: _child });
                }
            })

            reducers.registerBranchToItsParents(s, treeKey, flatMap, { branch })
        },
        registerBranchToItsParents: (s, treeKey, flatMap, { branch }) => {
            branch.parentPaths.forEach(parentPath => {
                // Check if parent exists
                const parentBranch = flatMap.get(parentPath)
                if (!parentBranch) return;

                if (!parentBranch.children)
                    parentBranch.children = new Map()

                parentBranch.children.set(branch.key, branch)
                parentBranch.canBeExpanded = true;
            })
        },
        checkAndMergePendingChildren: (s, treeKey, flatMap, { branch }) => {

            const gBranchKey = `${treeKey}.${branch.currentPath}`

            const pendingBranches = s.globalPendingBranches.get(gBranchKey)
            if (pendingBranches) {
                branch.children ??= new Map() // make sure the map exists

                // Merge the queued branches with the children of the branch we're going to add
                branch.children = new Map([
                    ...branch.children,
                    ...pendingBranches
                ])

                // set parent of all the queed branches to the 
                pendingBranches.forEach(_q => {
                    _q.parentPaths.add(branch.currentPath)
                })

                s.globalPendingBranches.delete(gBranchKey)
            }
        },
        eraseBranchFromParents: (s, treeKey, flatMap, { branch }) => {            
            branch.parentPaths.forEach((_parentPath) => {

                const _parentBranch = flatMap.get(_parentPath)

                if (!_parentBranch.children)
                    return

                _parentBranch.children.delete(branch.key)

                if (_parentBranch.children.size === 0)
                    _parentBranch.canBeExpanded = false;
            })
        },
        recursivelyEraseBranch: (s, treeKey, flatMap, { branchPath }) => {
            const branch = flatMap.get(branchPath)
            if (!branch) return

            // Delete every refrence its parents could have
            reducers.eraseBranchFromParents(s, treeKey, flatMap, { branch });

            // Delete every child recursevly
            branch.children?.forEach(_childBranch => {
                reducers.recursivelyEraseBranch(s, treeKey, flatMap, { branchPath: _childBranch.currentPath })
                branch.children.delete(_childBranch.key)
            })

            // finally delete the branch itself
            flatMap.delete(branchPath);
            branch.children = null
            branch.data = undefined
            branch.parentPaths = null
        },
        attachChildrenThatHaveLoaded: (s, treeKey, flatMap, { newBranches, parentBranch }) => {
            if (newBranches.size === 0) {
                parentBranch.children = newBranches
                parentBranch.canBeExpanded = false
            } else
                newBranches.forEach(_branch => {
                    reducers.addInternalBranch(s, treeKey, flatMap, { branch: _branch })
                })
        }
    })

    return reducers;
}



export type TreeSDKReducers = {
    addInternalBranch: (
        state: TreeSDK.State,
        treeKey: string,
        flatMap: Map<string, TreeSDK.Internal.Branch>,
        props: { branch: TreeSDK.Internal.Branch }
    ) => void
    checkAndMergePendingChildren: (
        state: TreeSDK.State,
        treeKey: string,
        flatMap: Map<string, TreeSDK.Internal.Branch>,
        props: { branch: TreeSDK.Internal.Branch }
    ) => void
    registerBranchToItsParents: (
        state: TreeSDK.State,
        treeKey: string,
        flatMap: Map<string, TreeSDK.Internal.Branch>,
        props: { branch: TreeSDK.Internal.Branch }
    ) => void
    eraseBranchFromParents: (
        state: TreeSDK.State,
        treeKey: string,
        flatMap: Map<string, TreeSDK.Internal.Branch>,
        props: { branch: TreeSDK.Internal.Branch }
    ) => void
    recursivelyEraseBranch: (
        state: TreeSDK.State,
        treeKey: string,
        flatMap: Map<string, TreeSDK.Internal.Branch>,
        props: { branchPath: string }
    ) => void
    attachChildrenThatHaveLoaded: (
        state: TreeSDK.State,
        treeKey: string,
        flatMap: Map<string, TreeSDK.Internal.Branch>,
        props: {
            newBranches: Map<string, TreeSDK.Internal.Branch>,
            parentBranch: TreeSDK.Internal.Branch
        }
    ) => void
}



const a = {

    q: () => {
        a.b();
    } ,
    b: () => {
        console.log("dasdsad")
    },

}