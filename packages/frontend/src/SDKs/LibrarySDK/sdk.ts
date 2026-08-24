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

@SDK("Library")
export class LibrarySDKImpl extends BaseSDK<LibrarySDK.State> {

    constructor() { super() }

    public readonly useStore = createWithEqualityFn<LibrarySDK.State>()(
        immer(() => ({
            folders: {},
            workflowMetas: {},
            treeExpandedByFolderId: {},
            treeData: {},
            selectors: _createLibrarySelectors_(this)
        })),
        shallow
    )

    private _config = {}
    public get config() { return this._config }

    public readonly selectors: LibrarySDK.Selectors = _createLibrarySelectors_(this)
    public readonly actions: LibrarySDK.Actions = _createLibraryActions_(this)

    public readonly openListPublicWorkflowDialog = openListPublicWorkflowDialog
    public readonly openUnlistPublicWorkflowDialog = openUnlistPublicWorkflowDialog
    public readonly openListingManagerDialog = openListingManagerDialog
}


export const LibrarySDK = SDK.get<LibrarySDKImpl>("Library")

export namespace LibrarySDK {

    export type State = {
        folders: Record<Library.Folder.Id, Library.Folder>;
        selectors: _LibrarySDKSelectors
        workflowMetas: Record<Workflow.Id, Library.WorkflowMeta>;
        treeExpandedByFolderId: Record<Library.Folder.Id, boolean>;
        treeData: TreeDomain.Dummy.Branch<FileSystemNodeData>;
    }

    export type Selectors = _LibrarySDKSelectors
    export type Actions = _LibrarySDKActions
}
