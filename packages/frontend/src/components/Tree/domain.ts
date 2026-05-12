export namespace Tree {
    export interface BranchBaseProps<T_Data = any> {
        branch: Branch<T_Data>
        level: number
        isExpanded: boolean
        isLeaf: boolean
        onToggle: () => void
    }

    export interface BranchRendererProps<T_Data = any> extends BranchBaseProps<T_Data> {
        DefaultRenderer: React.ComponentType<BranchBaseProps<T_Data>>
    }

    export type BranchRenderer<T_Data = any> = React.ComponentType<BranchRendererProps<T_Data>>

    export type BranchKey = string & { __brand: "BranchKey" }

    export namespace Dummy {
        export interface Branch<T_Data = any> {
            childBranches?: Record<BranchKey, Branch>
            isExpanded?: boolean
            data?: T_Data
            isExpandedByDefault?: boolean
        }
    }
    export type Dummy = Record<BranchKey, Dummy.Branch>

    export interface Branch<T_Data = any> extends Tree.Dummy.Branch<T_Data> {
        key: BranchKey
        path: BranchKey[]
        childBranches?: Record<BranchKey, Branch>
    }
}

export type Tree = Record<Tree.BranchKey, Tree.Branch>
