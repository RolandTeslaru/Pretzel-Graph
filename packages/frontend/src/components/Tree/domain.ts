export namespace Tree {

    export namespace Dummy {
        export interface Branch<T_Data = any> {
            childBranches?: Record<Branch.Key, Branch>
            containerType?: "array" | "object"
            isExpanded?: boolean
            data?: T_Data
            isExpandedByDefault?: boolean
        }
    }
    export type Dummy = Record<Branch.Key, Dummy.Branch>

    export interface Branch<T_Data = any> extends Tree.Dummy.Branch<T_Data> {
        key: Branch.Key
        path: Branch.Key[]
        pathString: Branch.PathString
        childBranches?: Record<Branch.Key, Branch>
        isLastSibling: boolean
        ancestorIsLast: boolean[]
    }
    export namespace Branch {
        export function isLeaf(branch: Branch): boolean {
            return !branch.childBranches || Object.keys(branch.childBranches).length === 0
        }
        export type Key = string & { __brand: "BranchKey" }
        export type Path = Key[]

        export type PathString = string & { __brand: "BranchPathString" }

        export interface RenderProps<T_Data = any> {
            branch: Branch<T_Data>
            level: number
            isExpanded: boolean
            isLeaf: boolean
            isLastSibling: boolean
            onToggle: () => void
        }
        export type Renderer<T_Data = any> = (props: RenderProps<T_Data>) => React.ReactNode
    }

}

export type Tree = Record<Tree.Branch.Key, Tree.Branch>
