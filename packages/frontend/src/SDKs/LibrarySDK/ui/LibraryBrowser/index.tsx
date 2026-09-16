import type { Workflow } from "@pretzel-graph/shared/domain"
import { Root } from "./root"
import { Content as TreeContent } from "./LibraryTree/content"
import { Header as TreeHeader } from "./LibraryTree/header"
import { SearchInput as TreeSearchInput } from "./LibraryTree/search-input"
import { Content as ViewContent, FolderViewSkeleton } from "./FolderView/content"
import { Header as ViewHeader } from "./FolderView/header"
import { Breadcrumbs } from "./FolderView/breadcrumbs"
import { SearchInput as ViewSearchInput } from "./FolderView/search-input"
import { CreateBtn } from "./FolderView/create-button"

export { useLibraryBrowser } from "./root"

export interface LibraryBrowserBaseProps {
    size?: 'default' | 'sm'
    selectedWorkflowId?: Workflow.Id
}

export const LibraryBrowser = {
    Root,
    Tree: Object.assign(TreeContent, {
        Header: TreeHeader,
        SearchInput: TreeSearchInput,
    }),
    View: Object.assign(ViewContent, {
        Header: ViewHeader,
        Breadcrumbs,
        SearchInput: ViewSearchInput,
        CreateBtn,
        Skeleton: FolderViewSkeleton,
    }),
}
