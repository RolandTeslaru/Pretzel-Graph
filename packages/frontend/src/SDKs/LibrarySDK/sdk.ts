import { create } from "zustand"
import { immer } from "zustand/middleware/immer";
import { _createLibraryActions_, type _LibrarySDKActions } from "./actions";
import { _createLibraryReducers_, type _LibrarySDKReducers } from "./reducers";
import { _createLibrarySelectors_, type _LibrarySDKSelectors } from "./selectors";
import { BaseSDK } from "../Base";
import { Workflow, Library } from "@vx-agent-editor/shared/domain";
import { SDK } from "../SDKManager";

@SDK("Library")
export class LibrarySDKImpl extends BaseSDK<LibrarySDK.State> {

    constructor() { super() }

    public readonly useStore = create<LibrarySDK.State>()(
        immer(() => ({
            projects: {},
            folders: {},
            workflowMetas: {},
            rootFolderByProject: {},
        }))
    )

    private _config = {}
    public get config() { return this._config }

    public readonly selectors: LibrarySDK.Selectors = _createLibrarySelectors_(this)
    public readonly reducers: LibrarySDK.Reducers = _createLibraryReducers_()
    public readonly actions: LibrarySDK.Actions = _createLibraryActions_(this)
}


export const LibrarySDK = SDK.get<LibrarySDKImpl>("Library")

export namespace LibrarySDK {

    export type State = {
        projects: Record<Library.Project.Id, Library.Project>;
        folders: Record<Library.Folder.Id, Library.Folder>;
        workflowMetas: Record<Workflow.Id, Library.WorkflowMeta>;
        // Index of project → its root folder id
        rootFolderByProject: Record<Library.Project.Id, Library.Folder.Id>;
    }

    export type Selectors = _LibrarySDKSelectors
    export type Actions = _LibrarySDKActions
    export type Reducers = _LibrarySDKReducers
}
