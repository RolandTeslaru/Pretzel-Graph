import { immer } from "zustand/middleware/immer";
import { _createLibraryActions_, type _LibrarySDKActions } from "./actions";
import { _createLibrarySelectors_, type _LibrarySDKSelectors } from "./selectors";
import { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base";
import { Workflow, Library } from "@pretzel-graph/shared/domain";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import type { Tree as TreeDomain } from '@/components/Tree/domain';
import type { FileSystemNodeData } from './actions';
import { openListPublicWorkflowDialog, openUnlistPublicWorkflowDialog, openListingManagerDialog } from './ui/listing-dialogs';
import { openCreateWorkflowDialog, openEditWorkflowDialog } from './ui/workflow-dialogs';
import { openCreateFolderDialog, openEditFolderDialog } from './ui/folder-dialogs';
import { openDeleteWorkflowDialog } from './ui/LibraryBrowser/FolderView/items/workflow';
import { openDeleteFolderDialog } from './ui/LibraryBrowser/FolderView/items/folder';
import { openDependencySelectorDialog } from './ui/DependencySelectorDialog';
import { openWorkflowSelector } from './ui/WorkflowSelector';

@SDK("Library")
export class LibrarySDKImpl extends BaseSDK<LibrarySDK.State> {

    constructor() { super() }

    public readonly useStore = createWithEqualityFn<LibrarySDK.State>()(
        immer(() => ({
            folders: {},
            workflowMetas: {},
            treeExpandedByFolderId: {},
            treeData: {},
            showHidden: readShowHidden(),
            selectors: _createLibrarySelectors_(this)
        })),
        shallow
    )

    private _config = {}
    public get config() { return this._config }

    public readonly selectors: LibrarySDK.Selectors = _createLibrarySelectors_(this)
    public readonly actions: LibrarySDK.Actions = _createLibraryActions_(this)

    public readonly openCreateWorkflowDialog       = openCreateWorkflowDialog
    public readonly openEditWorkflowDialog         = openEditWorkflowDialog
    public readonly openDeleteWorkflowDialog       = openDeleteWorkflowDialog
    public readonly openCreateFolderDialog         = openCreateFolderDialog
    public readonly openEditFolderDialog           = openEditFolderDialog
    public readonly openDeleteFolderDialog         = openDeleteFolderDialog
    public readonly openListPublicWorkflowDialog   = openListPublicWorkflowDialog
    public readonly openUnlistPublicWorkflowDialog = openUnlistPublicWorkflowDialog
    public readonly openListingManagerDialog       = openListingManagerDialog
    public readonly openDependencySelectorDialog   = openDependencySelectorDialog
    public readonly openWorkflowSelector           = openWorkflowSelector
}


const SHOW_HIDDEN_KEY = 'library.showHidden'

function readShowHidden(): boolean {
    try {
        return localStorage.getItem(SHOW_HIDDEN_KEY) === 'true'
    } catch {
        return false
    }
}

export function writeShowHidden(value: boolean) {
    try {
        localStorage.setItem(SHOW_HIDDEN_KEY, String(value))
    } catch {
        // storage unavailable; the toggle still works for this session
    }
}

export const LibrarySDK = SDK.get<LibrarySDKImpl>("Library")

export namespace LibrarySDK {

    export type State = {
        folders: Record<Library.Folder.Id, Library.Folder>;
        selectors: _LibrarySDKSelectors
        workflowMetas: Record<Workflow.Id, Library.WorkflowMeta>;
        treeExpandedByFolderId: Record<Library.Folder.Id, boolean>;
        treeData: TreeDomain.Dummy.Branch<FileSystemNodeData>;
        showHidden: boolean;
    }

    export type Selectors = _LibrarySDKSelectors
    export type Actions = _LibrarySDKActions
}
