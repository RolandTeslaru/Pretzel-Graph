import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { BaseSDK } from "../base";
import { _createTreeReducers_, TreeSDKReducers } from "./reducers";
import { _createTreeActions_, TreeSDKActions } from "./actions";
import { createInternalBranch, createInternalTree } from "./utils";


export class _TreeSDK_ extends BaseSDK<TreeSDK.State> {

    private constructor() { super() }

    public static readonly instance = new _TreeSDK_()
    public storageName = null

    public readonly useStore = create<TreeSDK.State>()(
        immer(() => ({
            trees: new Map(),
            flatMaps: new Map(),
            globalPendingBranches: new Map(),
        }))
    )

    public readonly reducers: TreeSDK.Reducers = _createTreeReducers_();
    public readonly actions: TreeSDK.Actions   = _createTreeActions_(this);

    public readonly factory = Object.freeze({
        createInternalTree: createInternalTree,
        createInternalBranch: createInternalBranch
    })
}

export const TreeSDK = _TreeSDK_.instance


TreeSDK.useStore.setState(s => {
    
})


export namespace TreeSDK {

    export namespace Dummy {
        export type Branch = {
            children?: Record<string, Branch>
            isExpanded?: boolean
            data?: any
            overrideRenderBranch?: Callbacks.RenderBranch
        }
        export type Tree = Record<string, Branch>
    }

    export namespace Internal {
        export type Branch<T = any> = {
            key: string
            currentPath: string  // unique   (  path1.path2.path3.key ) 
            children: Map<string, Branch> | null, // if null then it means it will sbhow the option to check and load branches if any
            isExpanded: boolean,
            canBeExpanded: boolean
            needsLazyLoading: boolean
            parentPaths: Set<string>
            data: T
            overrideRenderBranch?: Callbacks.RenderBranch
            isLoading: boolean
            isMounted: boolean
        }
        export type Tree = Record<string, Branch>
        export type FlatTree = Map<string, Branch>
    }


    export namespace Component {
        export type BranchTemplate = React.FC<{
            children:        React.ReactNode,
            className?:      string,
            listClassNames?: string,
            onClick?:        (e: React.MouseEvent<HTMLElement, MouseEvent>) => void,
            onContextMenu?:  (e: React.MouseEvent<HTMLElement, MouseEvent>) => void,
        }> & React.HTMLAttributes<HTMLDivElement>
    }

    export namespace Callbacks {
        export type BranchLoader = (
            parentBranch: Internal.Branch,
        ) => Map<string, Internal.Branch> | Promise<Map<string, Internal.Branch>>

        export type RenderChildren = (props: {
            treeKey:      string
            level:        number,
            branch:       Internal.Branch,
            renderBranch: RenderBranch,
            branchLoader: BranchLoader
        }) => React.ReactNode


        export namespace RenderBranch {
            export type Props = {
                treeKey:        string
                branch:         Internal.Branch,
                BranchTemplate: Component.BranchTemplate
            }
        }
        export type RenderBranch = (props: RenderBranch.Props) => React.ReactNode
    }

    export type TreeKey = string;
    export type BranchKey = string;
    export type GlobalKey = string;

 
    export type State = {
        trees:    Map<TreeKey, Internal.Tree>
        flatMaps: Map<TreeKey, Map<BranchKey, Internal.Branch>>
        // pendingBranches: Map<TreeKey, Map<BranchKey, Map<BranchKey, Internal.Branch>>>
        globalPendingBranches: Map<GlobalKey, Map<GlobalKey, Internal.Branch>>
    }

    export type Actions = TreeSDKActions


    export type Reducers = TreeSDKReducers

    export type CacheStrategy = "cache" | "ephemeral"
}