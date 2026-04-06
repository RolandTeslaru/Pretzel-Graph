import type { _TreeSDK_, TreeSDK } from "./sdk";
import { createInternalTree } from "./utils";

export function _createTreeActions_(_sdk: _TreeSDK_) {
    return Object.freeze({



        tree: {
            rebuildInternal: (treeKey, dummyTree) => {
                const { processedTree, branchFlatMap } = createInternalTree(dummyTree)
    
                _sdk.setState(s => {
                    s.trees.set(treeKey, processedTree)
                    s.flatMaps.set(treeKey, branchFlatMap)
                })
    
                return {
                    processedTree,
                    branchFlatMap
                }
            },
            ensure: (treeKey, dummyTree) => {
                _sdk.setState(s => {
                    const doesExist = s.trees.has(treeKey);
                    if(doesExist) return

                    const {processedTree, branchFlatMap} = createInternalTree(dummyTree);

                    s.trees.set(treeKey, processedTree)
                    s.flatMaps.set(treeKey, branchFlatMap)
                })
            },
            erase: (treeKey) => _sdk.setState(s => {
                s.flatMaps.delete(treeKey)
                s.trees.delete(treeKey)
            })
        },



        branch: {
            setLoading: (treeKey, branchKey, value) => _sdk.setState(s => {
                const branch = s.flatMaps.get(treeKey)?.get(branchKey)
                if (!branch) return
    
                branch.isLoading = value;
            }),
            setMounted: (treeKey, branchKey, value) => _sdk.setState(s => {
                const branch = s.flatMaps.get(treeKey)?.get(branchKey)
                if (!branch) return
    
                branch.isMounted = value;
            }),
            setExpanded: (treeKey, branchKey, value) => _sdk.setState(s => {
                const branch = s.flatMaps.get(treeKey)?.get(branchKey)
                if (!branch) return
    
                branch.isExpanded = value;
            }),
            addInternal: (treeKey, props) => _sdk.setState(s => { 
                const flatMap = s.flatMaps.get(treeKey);
                if (!flatMap) return;
                _sdk.reducers.addInternalBranch(s, treeKey, flatMap, props) }
            ),
            addDummy: (treeKey, {key, pendingDBranch, iParentBranch}) => _sdk.setState(s => {
                const flatMap = s.flatMaps.get(treeKey);
                if(!flatMap) return;

                const { newBranch } = _sdk.factory.createInternalBranch(
                    key,
                    pendingDBranch,
                    iParentBranch
                );

                _sdk.reducers.addInternalBranch(s, treeKey, flatMap, { branch: newBranch })
            }),
            recursivelyErase: (treeKey, props) => _sdk.setState(s => {
                const flatMap = s.flatMaps.get(treeKey);
                if (!flatMap) return;
                _sdk.reducers.recursivelyEraseBranch(s, treeKey, flatMap, props)
            }),
            erase: (treeKey, branchPath) => _sdk.setState(s => {
                const treeFlatMap = s.flatMaps.get(treeKey);
                if (!treeFlatMap) return;
    
                const branch = treeFlatMap.get(branchPath)
                if (!branch) return
    
                // Delete every refrence its parents could have
                _sdk.reducers.eraseBranchFromParents(s, treeKey, treeFlatMap, { branch });
    
                // finally delete the branch itself
                s.flatMaps.get(treeKey)?.delete(branchPath);
                branch.children = new Map()
                branch.data = undefined
                branch.parentPaths = new Set()
            }),
            
            handleChildrenLoad: async (treeKey, parentBranch, loader) => {
                _sdk.actions.branch.setExpanded(treeKey, parentBranch.currentPath, true);
    
                let loadedChildren: Map<string, TreeSDK.Internal.Branch> | null = null
    
                try {
                    const maybe = loader(parentBranch);
                    loadedChildren = await Promise.resolve(maybe);
                } finally {
                    _sdk.setState(s => {
                        const treeFlatMap = s.flatMaps.get(treeKey);
                        if (!treeFlatMap){
                            parentBranch.isLoading = false;
                            return;
                        };
                        _sdk.reducers.attachChildrenThatHaveLoaded(s, treeKey, treeFlatMap, {
                            newBranches: loadedChildren,
                            parentBranch
                        })
    
                        parentBranch.isExpanded = true;
                        parentBranch.isLoading = false;
                    })
                }
            },
        },


        
        dev: {
            dangerouslyOverridePropertyOnDataObjectInBranch: (treeKey, branchPath, propertyKey, propertyData) => _sdk.setState(s => {
                const branch = s.flatMaps.get(treeKey)?.get(branchPath)
                if (!branch) {
                    console.error("COULD NOT DANGEROUSLY OVERRIDE PROPERTY", propertyKey, " IN BRANCH", branchPath, " WITH DATA", propertyData)
                    return
                }
    
                branch.data[propertyKey] = propertyData
            }),
        }
    }) as TreeSDKActions
}


export type TreeSDKActions = {
    tree: {
        ensure: (treeKey: string, dummyTree: TreeSDK.Dummy.Tree) => void
        erase: (treeKey: string) => void
        rebuildInternal: (
            treeKey: string,
            dummyTree: TreeSDK.Dummy.Tree
        ) => {
            processedTree: TreeSDK.Internal.Tree,
            branchFlatMap: Map<string, TreeSDK.Internal.Branch>
        }

    },
    branch: {
        setLoading: (treeKey: string, brancKey: string, value: boolean) => void
        setMounted: (treeKey: string, branchKey: string, value: boolean) => void
        setExpanded: (treeKey: string, branchKey: string, value: boolean) => void
        addInternal: (
            treeKey: string,
            props: { branch: TreeSDK.Internal.Branch }
        ) => void
        addDummy: (
            treeKey: string,
            props: { 
                key: string,
                pendingDBranch: TreeSDK.Dummy.Branch 
                iParentBranch: TreeSDK.Internal.Branch
            }
        ) => void
        recursivelyErase: (
            treeKey: string,
            props: { branchPath: string }
        ) => void
        erase: (treeKey: string, branchPath: string) => void
        handleChildrenLoad: (treeKey: string, parentBranch: TreeSDK.Internal.Branch, loader: TreeSDK.Callbacks.BranchLoader) => void
    },
    dev: {
        dangerouslyOverridePropertyOnDataObjectInBranch: (
            treeKey: string,
            branchPath: string,
            propertyKey: string,
            propertyData: any
        ) => void
    }

}
