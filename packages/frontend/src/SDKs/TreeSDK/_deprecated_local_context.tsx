// import { createStore, useStore } from 'zustand';
// import { createContext, memo, useContext, useImperativeHandle, useMemo, useState } from 'react';
// import type { StoreApi } from 'zustand';
// import { immer } from "zustand/middleware/immer"
// import { enableMapSet } from "immer"
// import { shallow } from 'zustand/shallow';
// import { TreeTypes } from './components/types';
// import { TreeSDK } from './sdk';


// enableMapSet()

// export const createLocalTreeStore = (
//     processedTree: TreeTypes.Internal.Tree,
//     branchFlatMap: Map<string, TreeTypes.Internal.Branch>
// ) =>
//     createStore<TreeTypes.Store>()(
//         immer(
//             (set, get) => ({
//                 tree: processedTree,
//                 treeStucture: {},
//                 branchesFlatMap: branchFlatMap,
//                 queuedBranches: new Map(),

//                 actions: {
//                     addInternalBranch: (incomingBranch) => set(s => { s.reducers.addInternalBranch(incomingBranch, s) }),
//                     recursivelyEraseBranch: (branchPath) => set(s => { s.reducers.recursivelyEraseBranch(branchPath, s) }),
//                     setBranchLoading: (branchPath, value) => set(s => {
//                         const branch = s.branchesFlatMap.get(branchPath)
//                         if (!branch) return

//                         branch.isLoading = value;
//                     }),
//                     setBranchMounted: (branchPath, value) => set(s => {
//                         if (!s.branchesFlatMap.has(branchPath)) return

//                         const branch = s.branchesFlatMap.get(branchPath)
//                         branch.isMounted = value
//                     }),
//                     setExpanded: (branchPath, value) => set(s => {
//                         if (!s.branchesFlatMap.has(branchPath)) return

//                         const branch = s.branchesFlatMap.get(branchPath)
//                         branch.isExpanded = value
//                     }),
//                     attachChildrenThatHaveLoaded: (newBranches, parentPath) => set(s => {
//                         s.reducers.attachChildrenThatHaveLoaded(newBranches, parentPath, s)
//                     }),
//                     eraseBranch: (branchPath) => set(s => {
//                         if (!s.branchesFlatMap.has(branchPath))
//                             return

//                         const branch = s.branchesFlatMap.get(branchPath)

//                         // Delete every refrence its parents could have
//                         s.reducers.eraseBranchFromItsParents(branch, s)

//                         // finally delete the branch itself
//                         s.branchesFlatMap.delete(branchPath)
//                         branch.children = new Map()
//                         branch.data = undefined
//                         branch.parentPaths = new Set()
//                     }),
//                     dangerouslyOverridePropertyOnDataObjectInBranch: ({ branchPath, propertyKey, propertyData }) => set(s => {
//                         if (!s.branchesFlatMap.has(branchPath)) {
//                             console.error("COULD NOT DANGEROUSLY OVERRIDE PROPERTY", propertyKey, " IN BRANCH", branchPath, " WITH DATA", propertyData)
//                             return
//                         }
//                         const branch = s.branchesFlatMap.get(branchPath)

//                         branch.data[propertyKey] = propertyData
//                     })
//                 },
//                 reducers: {
//                     registerBranchToItsParents: (branch: TreeTypes.Internal.Branch, state: TreeTypes.Store) => {
//                         branch.parentPaths.forEach(parentPath => {
//                             // Check if parent exists
//                             if (!state.branchesFlatMap.has(parentPath))
//                                 return
//                             const parentBranch = state.branchesFlatMap.get(parentPath)
//                             if (!parentBranch.children)
//                                 parentBranch.children = new Map()

//                             parentBranch.children.set(branch.key, branch)
//                             parentBranch.canBeExpanded = true;
//                         })
//                     },
//                     checkAndMergeQueuedBranches: (branch: TreeTypes.Internal.Branch, state: TreeTypes.Store) => {
//                         const queuedBranches = state.queuedBranches.get(branch.currentPath)
//                         if (queuedBranches) {
//                             branch.children ??= new Map() // make sure the map exists

//                             // Merge the queued branches with the children of the branch we're going to add
//                             branch.children = new Map([
//                                 ...branch.children,
//                                 ...queuedBranches
//                             ])

//                             // set parent of all the queed branches to the 
//                             queuedBranches.forEach(_q => {
//                                 _q.parentPaths.add(branch.currentPath)
//                             })

//                             state.queuedBranches.delete(branch.currentPath)
//                         }
//                     },
//                     addInternalBranch: (incomingBranch, s) => {
//                         // Ceck for queued branches
//                         s.reducers.checkAndMergeQueuedBranches(incomingBranch, s)

//                         // Add in the flat Map
//                         s.branchesFlatMap.set(incomingBranch.currentPath, incomingBranch)

//                         // Iteratively add all children of the branch to the flat map
//                         // Recursively add all children of this branch
//                         if (incomingBranch.children && incomingBranch.children.size > 0) {
//                             incomingBranch.children.forEach(_child => {
//                                 if (!s.branchesFlatMap.has(_child.currentPath)) {
//                                     // Ensure child's parentPaths contains current branch
//                                     _child.parentPaths.add(incomingBranch.currentPath)
//                                     // Reuse same logic for each child
//                                     s.reducers.addInternalBranch(_child, s)
//                                 }
//                             })
//                         }

//                         s.reducers.registerBranchToItsParents(incomingBranch, s)
//                     },

//                     eraseBranchFromItsParents: (branch, s) => {
//                         branch.parentPaths.forEach((_parentPath) => {
//                             const _parentBranch = s.branchesFlatMap.get(_parentPath)
//                             if (!_parentBranch.children) return
//                             _parentBranch.children.delete(branch.key)

//                             if (_parentBranch.children.size === 0)
//                                 _parentBranch.canBeExpanded = false;
//                         })
//                     },

//                     recursivelyEraseBranch: (branchPath, s) => {
//                         if (!s.branchesFlatMap.has(branchPath))
//                             return

//                         const branch = s.branchesFlatMap.get(branchPath)

//                         // Delete every refrence its parents could have
//                         s.reducers.eraseBranchFromItsParents(branch, s)

//                         // Delete every child recursevly
//                         branch.children?.forEach(_childBranch => {
//                             s.reducers.recursivelyEraseBranch(_childBranch.currentPath, s)
//                             branch.children.delete(_childBranch.key)
//                         })

//                         // finally delete the branch itself
//                         s.branchesFlatMap.delete(branchPath)
//                         branch.children = null
//                         branch.data = undefined
//                         branch.parentPaths = null
//                     },
//                     attachChildrenThatHaveLoaded: (newBranches, parentPath, s) => {
//                         if (newBranches.size === 0) {
//                             const branch = s.branchesFlatMap.get(parentPath)
//                             if (branch) {
//                                 branch.children = newBranches
//                                 branch.canBeExpanded = false
//                             }
//                         } else
//                             newBranches.forEach(_branch => {
//                                 s.reducers.addInternalBranch(_branch, s)
//                             })
//                     }
//                 },

//             }))
//     );


// export const TreeContext = createContext<StoreApi<TreeTypes.Store> | null>(null)


// // export const TreeProvider: React.FC<TreeTypes.Provider> = memo(({ treeKey, children, processedTree, branchFlatMap, ref }) => {

// //     const storeObject = useMemo(() => {
// //         if (TreeSDK.state.localStores.has(treeKey)) {
// //             return TreeSDK.state.localStores.get(treeKey)
// //         }

// //         const store = createLocalTreeStore(processedTree, branchFlatMap)
// //         TreeSDK.actions.registerTreeStore(treeKey, store)

// //         return store
// //     }, [])

// //     return (
// //         <TreeContext.Provider value={storeObject}>
// //             {children}
// //         </TreeContext.Provider>
// //     )
// // })



// // export function useLocalTree<T>(selector: (s: TreeTypes.Store) => T): T
// // export function useLocalTree(): TreeTypes.Store

// // export function useLocalTree<T>(selector?: (s: TreeTypes.Store) => T) {
// //     const store = useContext(TreeContext)
// //     if (!store) throw new Error('Missing TreeProvider')

// //     const sel = (selector ?? ((s: TreeTypes.Store) => s)) as (s: TreeTypes.Store) => any
// //     return useStore(store, sel) as any
// // }

// // export function getLocalTreeStore() {
// //     const store = useContext(TreeContext)
// //     return store
// // }

// // export function useBranch(path: string) {
// //     return useLocalTree(state => state.branchesFlatMap.get(path));
// // }

// // function mergeMap(finalMap: Map<string, any>, maps: Map<string, any>[]){
// //     maps.forEach(_map => {
// //         Object.entries(_map).forEach(([path, data]) => {
// //             finalMap.set(path, data)
// //         })
// //     })
// // }

